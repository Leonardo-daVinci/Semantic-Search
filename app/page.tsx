'use client'
import {useState} from 'react'


export default function Home() {
// Setting up few local variables
const [query, setQuery] = useState('')
const [result, setResult] = useState('')
const [loading, setLoading] = useState(false)

// Setup function to create Index and add our data to Pinecone
async function createIndexAndEmbeddings(){
  try {
    const result = await fetch('/api/setup',{
      method: "POST"
    })
    const json = await result.json()
    console.log('results: ', json);
    
  } catch (error) {
    console.log('error: ', error);
  }
}

// Function to Query Pinecone
async function sendQuery(){
  if(!query) return

  setResult('')
  setLoading(true)

  try {
    const result = await fetch('/api/read', {
      method: "POST",
      body: JSON.stringify(query)
    })
    const json = await result.json()
    setResult(json.data)
    setLoading(false)

  } catch (error) {
    console.log('error:', error);
    setLoading(false)
    
  }
}
  return (
    <main className="flex flex-col items-center justify-between p-24">
      
      <input className='text-black px-2 py-1' 
        onChange={e => setQuery(e.target.value)}/>

      <button className='px-7 py-1 rounded-2xl bg-white text-black mt-2 mb-2'
        onClick={sendQuery}>
          Ask AI
      </button>

      {loading && <p>Asking AI ...</p>}

      {result && <p>{result}</p>}

      <button onClick={createIndexAndEmbeddings}>
        Create Index and Embeddings
      </button>

    </main>
  )
}
