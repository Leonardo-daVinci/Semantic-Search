import { NextRequest, NextResponse } from "next/server";
import { PineconeClient } from "@pinecone-database/pinecone";
import { queryPinecone } from "@/utils";
import { indexName } from "@/config";

export async function POST(req: NextRequest){
    const body = await req.json()

    const client = new PineconeClient()
    await client.init({
        apiKey: process.env.PINECONE_API_KEY || '',
        environment: process.env.PINECONE_ENV || ''
    })

    const text = await queryPinecone(client, indexName, body)
    return NextResponse.json({
        data: text
    })
}