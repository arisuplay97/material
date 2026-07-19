async function run() {
  try {
    const res = await fetch("https://gudangtiara.vercel.app/api/hello");
    const text = await res.text();
    console.log("HELLO STATUS:", res.status, text);
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

run();
