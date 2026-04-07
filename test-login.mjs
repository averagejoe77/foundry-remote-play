// using native fetch

async function testFetch() {
  const foundryUrl = 'http://localhost:30000';
  
  try {
    const res = await fetch(`${foundryUrl}/api/users`);
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
  } catch (e) {
    console.error(e);
  }
}

testFetch();
