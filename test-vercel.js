async function run() {
  try {
    const res = await fetch("https://gudangtiara.vercel.app/api/healthz");
    const text = await res.text();
    console.log("HEALTHZ STATUS:", res.status);
    console.log("HEALTHZ BODY:", text);
  } catch (err) {
    console.error("ERROR:", err.message);
  }

  console.log("\n=========================\n");

  try {
    const res2 = await fetch("https://gudangtiara.vercel.app/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@pdam-tiara.id", password: "password123" }),
    });
    const text2 = await res2.text();
    console.log("LOGIN STATUS:", res2.status);
    console.log("LOGIN BODY:", text2);
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
  }
}

run();
