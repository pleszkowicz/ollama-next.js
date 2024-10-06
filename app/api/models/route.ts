export async function GET() {
  const response = await fetch('http://localhost:11434/api/tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  console.log('data', data)
}
