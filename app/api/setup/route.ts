import { NextResponse } from "next/server";
import { PineconeClient } from "@pinecone-database/pinecone";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { createPinconeIndex, updatePinecone } from "@/utils";
import { indexName } from "@/config";

export async function POST() {
    const loader = new DirectoryLoader('./documents', {
        ".txt": (path) => new TextLoader(path),
        ".md": (path) => new TextLoader(path),
        ".pdf": (path) => new PDFLoader(path),
    })

    const docs = await loader.load()
    const vectorDImensions = 1536

    const client = new PineconeClient()
    await client.init({
        apiKey: process.env.PINECONE_API_KEY || '',
        environment: process.env.PINECONE_ENV || ''
    })

    try {
        await createPinconeIndex(client, indexName, vectorDImensions)
        await updatePinecone(client, indexName, docs)
    } catch (err) {
        console.log('Error: ', err)
    }

    return NextResponse.json({
        data: 'Created Index and Added Data to Pinecone'
    })
}