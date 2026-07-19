async function run() {
  try {
    const res = await fetch("https://gudangtiara.vercel.app/api/db-check");
    const text = await res.text();
    console.log("STATUS CODE:", res.status);
    console.log("RESPONSE BODY:", text);
  } catch (err) {
    console.error("FETCH ERROR:", err);
  }
}

run();
