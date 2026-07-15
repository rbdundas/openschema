'use strict';

/**
 * Minimal file-based JSON store for user accounts.
 *
 * Data lives in a single JSON file (data/users.json). Writes are atomic
 * (write to a temp file, then rename) and serialized through a small in-memory
 * queue so concurrent requests can't interleave and corrupt the file.
 *
 * Passwords are NEVER stored here in plaintext — callers pass an already-hashed
 * value (see server/index.js, which uses bcrypt).
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');
const TMP_FILE = path.join(DATA_DIR, 'users.json.tmp');

// Ensure the data file exists before we serve any request.
function init() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

async function readAll() {
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.users) ? parsed.users : [];
}

// Serialize all writes so read-modify-write cycles don't race each other.
let writeChain = Promise.resolve();
function withLock(fn) {
  const run = writeChain.then(fn, fn);
  // Keep the chain alive even if this operation rejects.
  writeChain = run.catch(() => {});
  return run;
}

async function writeAll(users) {
  await fsp.writeFile(TMP_FILE, JSON.stringify({ users }, null, 2));
  await fsp.rename(TMP_FILE, DATA_FILE); // atomic on POSIX
}

function normalize(username) {
  return String(username).trim().toLowerCase();
}

async function findByUsername(username) {
  const key = normalize(username);
  const users = await readAll();
  return users.find((u) => normalize(u.username) === key) || null;
}

/**
 * Add a user. Returns the stored record (without the hash) or throws if the
 * username is already taken.
 */
function addUser({ username, passwordHash, createdAt }) {
  return withLock(async () => {
    const users = await readAll();
    const key = normalize(username);
    if (users.some((u) => normalize(u.username) === key)) {
      const err = new Error('username already taken');
      err.code = 'USERNAME_TAKEN';
      throw err;
    }
    const id = users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;
    const record = { id, username: username.trim(), passwordHash, createdAt };
    users.push(record);
    await writeAll(users);
    return { id: record.id, username: record.username, createdAt: record.createdAt };
  });
}

module.exports = { init, readAll, findByUsername, addUser };