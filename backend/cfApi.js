const axios = require("axios");

const CF_BASE = "https://codeforces.com/api";

/**
 * Generic helper to call CF API and throw if something is wrong.
 */
async function cfGet(method, params = {}) {
  const url = `${CF_BASE}/${method}`;
  const res = await axios.get(url, { params });

  if (res.data.status !== "OK") {
    const comment = res.data.comment || "Unknown Codeforces error";
    const error = new Error(comment);
    error.cfStatus = res.data.status;
    throw error;
  }

  return res.data.result;
}

/**
 * Get info about a single user.
 */
async function getUserInfo(handle) {
  const result = await cfGet("user.info", { handles: handle });
  // result is an array with one element
  return result[0];
}

/**
 * Validate that a handle exists.
 * Returns { valid: boolean, info?: object, error?: string }
 */
async function validateHandle(handle) {
  try {
    const info = await getUserInfo(handle);
    return { valid: true, info };
  } catch (err) {
    return {
      valid: false,
      error: err.message || "Failed to validate handle",
    };
  }
}

/**
 * Get a Set of "contestId-index" strings for all solved problems of a user.
 */
async function getUserSolvedSet(handle) {
  // user.status returns all submissions
  const submissions = await cfGet("user.status", { handle });

  const solved = new Set();
  for (const sub of submissions) {
    if (sub.verdict === "OK" && sub.problem && sub.problem.contestId && sub.problem.index) {
      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      solved.add(key);
    }
  }

  return solved;
}

/**
 * Fetch full Codeforces problemset (with statistics).
 * Returns { problems, problemStatistics } directly from CF.
 */
async function getProblemset() {
  const result = await cfGet("problemset.problems");
  // result = { problems: [...], problemStatistics: [...] }
  return result;
}

/**
 * Get recent submissions for a user.
 * CF caps at 10k; we request up to `count` from the start.
 */
async function getUserSubmissions(handle, count = 1000) {
  const submissions = await cfGet("user.status", {
    handle,
    from: 1,
    count,
  });
  return submissions;
}



module.exports = {
  validateHandle,
  getUserSolvedSet,
  getUserInfo,
  getProblemset,
  getUserSubmissions,
};

