export const calls = [];
const rec = (kind) => (msg, opts) => (calls.push({ kind, msg, opts }), "id");
const toast = Object.assign(rec("info"), { success: rec("success"), error: rec("error"), loading: rec("loading") });
export default toast;
