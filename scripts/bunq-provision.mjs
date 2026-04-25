#!/usr/bin/env node
/**
 * Full bunq sandbox API context: create user, RSA keys, installation, device-server, session.
 * Writes PEMs under .bunq/ and merges bunq-related keys into .env (or prints for AWS/SSM).
 *
 * Usage (from repository root):
 *   node scripts/bunq-provision.mjs
 *   node scripts/bunq-provision.mjs --write-env .env --user-type person   # personal (default is company)
 *   (Do not use --env-file — Node 20+ reserves that flag before your script runs.)
 *   node scripts/bunq-provision.mjs --dry-run
 *   node scripts/bunq-provision.mjs --print-env
 *
 * Refresh session only (after token expiry; reuses BUNQ_API_KEY, installation token, and private key):
 *   node scripts/bunq-provision.mjs --refresh-session
 *
 * For AWS/ECS, use --print-env and load values into SSM/Secrets Manager. Session tokens expire — schedule
 * --refresh-session or a cron that runs this with existing credentials.
 *
 * Production (non-sandbox): set BUNQ_API_BASE_URL to https://api.bunq.com/v1, create a user + API key
 * in the bunq app, then use this script only to generate keys and perform installation/device/session
 * by temporarily adapting the flow (or run Bruno). Sandbox is the default path.
 */

import crypto, { randomBytes } from "crypto"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join, dirname, isAbsolute, sep } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, "..")
const args = process.argv.slice(2)

function arg(name, def) {
  const i = args.indexOf(name)
  if (i === -1) return def
  return args[i + 1] ?? def
}
function hasFlag(f) {
  return args.includes(f)
}

const dryRun = hasFlag("--dry-run")
const printEnv = hasFlag("--print-env")
const refreshSession = hasFlag("--refresh-session")
const envFile = arg("--write-env", join(REPO_ROOT, ".env")) || join(REPO_ROOT, ".env")
const keyDir = arg("--key-dir", join(REPO_ROOT, ".bunq")) || join(REPO_ROOT, ".bunq")
const userType = (arg("--user-type", "company") || "company").toLowerCase()
const baseUrl = (arg("--api-base", "https://public-api.sandbox.bunq.com/v1") || "").replace(/\/$/, "")

if (!["person", "company"].includes(userType)) {
  console.error("Invalid --user-type (use person|company)")
  process.exit(1)
}

const sandboxPath = userType === "company" ? "sandbox-user-company" : "sandbox-user-person"

function requestId() {
  return `bunq-provision-${Date.now()}-${randomBytes(4).toString("hex")}`
}

const commonHeaders = {
  "X-Bunq-Language": "en_US",
  "X-Bunq-Region": "nl_NL",
  "X-Bunq-Geolocation": "0 0 0 0 000",
  "User-Agent": "bunq-events-provision/1.0",
}

function signRsaSha256(privateKeyPem, bodyString) {
  const sign = crypto.createSign("RSA-SHA256")
  sign.update(bodyString, "utf8")
  sign.end()
  return sign.sign(privateKeyPem, "base64")
}

/** @param {{ ok: boolean, status: number, text: string }} res */
function parseBunqJson(res, label) {
  const { text } = res
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`${label}: invalid JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) {
    const err = (data.Error && data.Error[0] && data.Error[0].error_description) || text
    throw new Error(`${label}: HTTP ${res.status} — ${err}`)
  }
  return data
}

function wrap(res, text) {
  return { ok: res.ok, status: res.status, text }
}

async function fetchText(url, options) {
  const res = await fetch(url, options)
  const text = await res.text()
  return { res, text }
}

function getInstallationItems(data) {
  const list = data.Response || []
  const token = list.find((r) => r.Token)?.Token?.token
  const sk = list.find((r) => r.ServerPublicKey)?.ServerPublicKey?.server_public_key
  return { token, serverPublicKey: sk }
}

function getSessionUser(data) {
  const list = data.Response || []
  const token = list.find((r) => r.Token)?.Token?.token
  const row = list.find((r) => r.UserPerson || r.UserCompany || r.UserApiKey)
  const u = row && (row.UserPerson || row.UserCompany || row.UserApiKey)
  const displayName = u?.name ?? u?.display_name ?? u?.public_nick_name ?? ""
  return { token, user: u, displayName }
}

function relFromRepo(absolutePath) {
  if (!absolutePath.startsWith(REPO_ROOT)) return absolutePath
  return absolutePath.slice(REPO_ROOT.length + 1).split(sep).join("/")
}

/**
 * @param {string} filePath
 * @param {Record<string, string>} updates
 */
function mergeEnvFile(filePath, updates) {
  const keys = new Set(Object.keys(updates))
  const lines = existsSync(filePath) ? readFileSync(filePath, "utf8").split(/\r?\n/) : []
  const out = []
  const consumed = new Set()
  for (const line of lines) {
    let replaced = false
    for (const k of keys) {
      if (line.startsWith(`${k}=`) || line.startsWith(`${k} =`)) {
        if (!consumed.has(k)) {
          out.push(`${k}=${encodeEnvValue(updates[k])}`)
          consumed.add(k)
          replaced = true
        }
        break
      }
    }
    if (!replaced) out.push(line)
  }
  for (const k of keys) {
    if (!consumed.has(k)) {
      if (updates[k] === "" && k === "BUNQ_SERVER_PUBLIC_KEY_PATH") continue
      out.push(`${k}=${encodeEnvValue(updates[k])}`)
    }
  }
  writeFileSync(filePath, out.join("\n") + (out.length ? "\n" : ""), "utf8")
}

function encodeEnvValue(v) {
  if (v == null) return '""'
  if (/[\s#"']/.test(v) || v === "") {
    return `"${String(v)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")}"`
  }
  return v
}

function loadEnvFromFile(filePath) {
  if (!existsSync(filePath)) return {}
  const env = {}
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let val = m[2]
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
    } else {
      val = val.replace(/^\s+|\s+$/g, "")
    }
    env[m[1]] = val
  }
  return env
}

function resolveKeyPath(p) {
  if (!p) return null
  if (isAbsolute(p)) return p
  return join(REPO_ROOT, p)
}

function ensureEnvFileWritable(path) {
  const dir = dirname(path)
  if (dir && dir !== "." && !existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(path)) writeFileSync(path, "\n", { mode: 0o600 })
}

// ---------- main flow ----------

async function main() {
  let apiKey,
    privateKeyPem,
    publicKeyPem,
    installationToken,
    serverPublicKey,
    sessionToken,
    userId,
    accountId

  if (!printEnv && !dryRun) ensureEnvFileWritable(envFile)

  if (refreshSession) {
    const e = { ...process.env, ...loadEnvFromFile(envFile) }
    apiKey = e.BUNQ_API_KEY
    installationToken = e.BUNQ_INSTALLATION_TOKEN
    privateKeyPem = e.BUNQ_PRIVATE_KEY
    if (!privateKeyPem) {
      const p = resolveKeyPath(e.BUNQ_PRIVATE_KEY_PATH)
      if (p && existsSync(p)) privateKeyPem = readFileSync(p, "utf8")
    }
    if (!apiKey || !privateKeyPem) {
      console.error("For --refresh-session, set BUNQ_API_KEY, BUNQ_INSTALLATION_TOKEN, and BUNQ_PRIVATE_KEY or BUNQ_PRIVATE_KEY_PATH in .env")
      process.exit(1)
    }
    if (!installationToken) {
      console.error("BUNQ_INSTALLATION_TOKEN is required for --refresh-session.")
      process.exit(1)
    }
    console.log("Opening new session (skipping device registration)…\n")
  }

  if (!refreshSession) {
    console.log(`Creating sandbox ${userType} user (POST /${sandboxPath})…\n`)
    const { res, text } = await fetchText(`${baseUrl}/${sandboxPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Bunq-Client-Request-Id": requestId(),
        ...commonHeaders,
      },
    })
    const sdata = parseBunqJson(wrap(res, text), "sandbox user")
    const k =
      sdata.Response?.find((r) => r.ApiKey)?.ApiKey ||
      sdata.Response?.find((r) => r.ApiCredential)?.ApiCredential
    apiKey = k?.api_key
    if (!apiKey) {
      throw new Error("No api_key in sandbox user response (expected ApiKey in Response)")
    }
    console.log("Got API key. Generating RSA key pair…\n")
    if (!existsSync(keyDir)) mkdirSync(keyDir, { mode: 0o700, recursive: true })
    if (!dryRun && !printEnv) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      })
      publicKeyPem = publicKey
      privateKeyPem = privateKey
      const pubPath = join(keyDir, "bunq-client-public.pem")
      const privPath = join(keyDir, "bunq-client-private.pem")
      writeFileSync(privPath, privateKey, { mode: 0o600 })
      writeFileSync(pubPath, publicKey, { mode: 0o644 })
      console.log(`Wrote: ${privPath}\nWrote: ${pubPath}\n`)
    } else {
      const pair = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      })
      publicKeyPem = pair.publicKey
      privateKeyPem = pair.privateKey
    }

    console.log("Registering installation…\n")
    const instBody = JSON.stringify({ client_public_key: publicKeyPem })
    const { res: ir, text: it } = await fetchText(`${baseUrl}/installation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Bunq-Client-Request-Id": requestId(),
        ...commonHeaders,
      },
      body: instBody,
    })
    const instData = parseBunqJson(wrap(ir, it), "installation")
    const inst = getInstallationItems(instData)
    installationToken = inst.token
    serverPublicKey = inst.serverPublicKey
    if (!installationToken) {
      throw new Error("No installation token in response")
    }
    if (serverPublicKey && !printEnv && !dryRun) {
      writeFileSync(join(keyDir, "bunq-server-public.pem"), serverPublicKey, { mode: 0o644 })
    }
  }

  if (!apiKey || !privateKeyPem) {
    throw new Error("Internal error: missing apiKey or private key after setup")
  }
  if (!installationToken) {
    throw new Error("Internal error: missing installationToken")
  }

  const privateKeyForSign = privateKeyPem

  if (!refreshSession) {
    const deviceBodyString = JSON.stringify({
      description: "bunq-events (provision)",
      secret: apiKey,
      permitted_ips: ["*"],
    })
    const deviceSig = signRsaSha256(privateKeyForSign, deviceBodyString)
    console.log("Registering device…\n")
    const { res: dr, text: dt } = await fetchText(`${baseUrl}/device-server`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Bunq-Client-Request-Id": requestId(),
        "X-Bunq-Client-Authentication": installationToken,
        "X-Bunq-Client-Signature": deviceSig,
        ...commonHeaders,
      },
      body: deviceBodyString,
    })
    try {
      parseBunqJson(wrap(dr, dt), "device-server")
    } catch (e) {
      const msg = String(e.message).toLowerCase()
      if (msg.includes("already") || msg.includes("duplicate") || msg.includes("registered")) {
        console.log("Device step reported existing registration; continuing to session…\n")
      } else {
        throw e
      }
    }
  }

  const sessionBodyString = JSON.stringify({ secret: apiKey })
  const sessionSig = signRsaSha256(privateKeyForSign, sessionBodyString)
  console.log("Creating session…\n")
  const { res: sr, text: st } = await fetchText(`${baseUrl}/session-server`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Bunq-Client-Request-Id": requestId(),
      "X-Bunq-Client-Authentication": installationToken,
      "X-Bunq-Client-Signature": sessionSig,
      ...commonHeaders,
    },
    body: sessionBodyString,
  })
  const sessData = parseBunqJson(wrap(sr, st), "session-server")
  const sInfo = getSessionUser(sessData)
  sessionToken = sInfo.token
  userId = sInfo.user ? String(sInfo.user.id) : ""
  const displayName = sInfo.displayName
  if (!sessionToken) throw new Error("No session token in response")
  if (!userId) console.warn("Warning: no user id in session response; list accounts may be skipped.")

  if (userId) {
    const { res: ar, text: at } = await fetchText(`${baseUrl}/user/${userId}/monetary-account-bank?count=25`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        "X-Bunq-Client-Request-Id": requestId(),
        "X-Bunq-Client-Authentication": sessionToken,
        ...commonHeaders,
      },
    })
    if (ar.ok) {
      const aData = JSON.parse(at)
      const acc = (aData.Response || []).map((o) => o.MonetaryAccountBank).find(Boolean)
      if (acc && acc.id) {
        accountId = String(acc.id)
        const updateBody = JSON.stringify({ description: "Main Account Prd" })
        const updateSig  = signRsaSha256(privateKeyForSign, updateBody)
        await fetchText(`${baseUrl}/user/${userId}/monetary-account-bank/${accountId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Bunq-Client-Request-Id": requestId(),
            "X-Bunq-Client-Authentication": sessionToken,
            "X-Bunq-Client-Signature": updateSig,
            ...commonHeaders,
          },
          body: updateBody,
        })
      }
    }
  }

  if (!refreshSession && userId && accountId && !dryRun) {
    const topUps = [
      { amount: "500.00", description: "Ticket sales – Neon Nights" },
      { amount: "499.50", description: "VIP table deposit" },
      { amount: "320.00", description: "Bar tab settlement" },
      { amount: "500.00", description: "Sponsor contribution" },
      { amount: "95.75",  description: "Merch sales" },
      { amount: "480.00", description: "Corporate event booking" },
      { amount: "430.60", description: "Ticket refund reversal" },
    ]
    const total = topUps.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(2)
    console.log(`Seeding sandbox account with €${parseFloat(total).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} across ${topUps.length} transactions…\n`)
    for (let i = 0; i < topUps.length; i++) {
      const { amount, description } = topUps[i]
      const body = JSON.stringify({
        amount_inquired: { value: amount, currency: "EUR" },
        counterparty_alias: { type: "EMAIL", value: "sugardaddy@bunq.com", name: "Sugar Daddy" },
        description,
        allow_bunqme: false,
      })
      const sig = signRsaSha256(privateKeyForSign, body)
      const { res: tr, text: tt } = await fetchText(
        `${baseUrl}/user/${userId}/monetary-account/${accountId}/request-inquiry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "X-Bunq-Client-Request-Id": requestId(),
            "X-Bunq-Client-Authentication": sessionToken,
            "X-Bunq-Client-Signature": sig,
            ...commonHeaders,
          },
          body,
        }
      )
      if (!tr.ok) {
        console.warn(`⚠️  Transaction ${i + 1} failed (${tr.status}): ${tt.slice(0, 120)}`)
      } else {
        process.stdout.write(`  [${i + 1}/${topUps.length}] €${amount} — ${description} ✓\n`)
      }
    }
    console.log("\n✓ Sandbox account seeded.\n")
  }

  const privPathRel = relFromRepo(join(keyDir, "bunq-client-private.pem"))
  const pubPathRel = relFromRepo(join(keyDir, "bunq-client-public.pem"))
  const serverPubRel = relFromRepo(join(keyDir, "bunq-server-public.pem"))

  const updates = {
    BUNQ_API_BASE_URL: baseUrl,
    BUNQ_API_KEY: apiKey,
    BUNQ_SESSION_TOKEN: sessionToken,
    BUNQ_USER_ID: userId || "",
    BUNQ_DEFAULT_MONETARY_ACCOUNT_ID: accountId || "",
    BUNQ_DISPLAY_NAME: displayName || "",
  }
  if (!refreshSession) {
    updates.BUNQ_INSTALLATION_TOKEN = installationToken
  }
  if (!dryRun && !printEnv && !refreshSession) {
    updates.BUNQ_PRIVATE_KEY_PATH = privPathRel
    updates.BUNQ_PUBLIC_KEY_PATH = pubPathRel
    if (serverPublicKey) updates.BUNQ_SERVER_PUBLIC_KEY_PATH = serverPubRel
  }

  if (printEnv) {
    for (const [k, v] of Object.entries(updates)) {
      if (v === "" && (k === "BUNQ_USER_ID" || k === "BUNQ_DEFAULT_MONETARY_ACCOUNT_ID")) continue
      if (k === "BUNQ_SERVER_PUBLIC_KEY_PATH" && v === "") continue
      if (v !== "" || k.startsWith("BUNQ_")) process.stdout.write(`${k}=${encodeEnvValue(String(v))}\n`)
    }
    if (!hasFlag("--inline-private-key")) {
      console.error(
        "\n# WARNING: BUNQ_PRIVATE_KEY_PATH above points to a local file that was NOT written (--print-env skips disk writes)." +
        "\n# For server/CI/AWS deployments, re-run with --inline-private-key to embed the PEM directly:" +
        "\n#   node scripts/bunq-provision.mjs --print-env --inline-private-key" +
        "\n# Store the resulting BUNQ_PRIVATE_KEY value in SSM/Secrets Manager instead of a file path."
      )
    }
    console.error(
      "\n# For AWS, store secrets in SSM/Secrets Manager; re-run with --refresh-session when the session token expires."
    )
    return
  }

  if (dryRun) {
    console.log("Dry run — would merge these BUNQ_* keys:\n", updates)
    return
  }

  if (hasFlag("--inline-private-key") && !refreshSession && privateKeyPem) {
    updates.BUNQ_PRIVATE_KEY = privateKeyPem.replace(/\r\n/g, "\n")
  }

  mergeEnvFile(envFile, updates)
  console.log(`\nUpdated ${envFile} with BUNQ_* variables.`)
  console.log(
    "When the session expires, run from backend/: npm run bunq:provision -- --refresh-session (pass the same --write-env <file> if you use a non-default path)."
  )
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
