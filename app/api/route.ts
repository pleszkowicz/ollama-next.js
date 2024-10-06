type OllamaResponse = {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
}

async function* ollamaIterator(prompt: string): AsyncGenerator<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.NEXT_PUBLIC_OLLAMA_MODEL, // Use the correct model
      prompt: prompt,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Failed to read stream');
  }

  let partialChunk = ''; // To handle partial JSON objects across chunks


  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    // Decode the chunk from Uint8Array to string
    const chunk = decoder.decode(value, { stream: true })

    // Handle partial JSON objects
    partialChunk += chunk;

    // Split the chunk by newlines to get individual JSON objects
    const jsonObjects = partialChunk.split('\n');

    // The last element might be incomplete, so save it for the next chunk
    partialChunk = jsonObjects.pop() || '';

    // Process each complete JSON object
    for (const jsonString of jsonObjects) {
      if (jsonString) {
        try {
          const parsed: OllamaResponse = JSON.parse(jsonString);
          const responseMessage = parsed.response || ''; // Extract the `response` field

          const multilineResponse = responseMessage.replaceAll('\n', '<br />');

          // Yield only the response field
          yield multilineResponse
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      }
    }
  }

}

function iteratorToStream(iterator: AsyncIterableIterator<string>) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
  });
}

export async function POST(req: Request) {
  const { prompt } = await req.json()

  const iterator = ollamaIterator(prompt);
  const stream = iteratorToStream(iterator);

  return new Response(stream, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
