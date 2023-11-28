import { OpenAIEmbeddings } from "langchain/embeddings/openai"
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"
import { OpenAI } from "langchain/llms/openai"
import { loadQAStuffChain } from "langchain/chains"
import { Document } from "langchain/document"
import { timeout } from "./config"

// Function to create Pinecone index
export const createPinconeIndex =async (
    client, indexName, vectorDImension
) => {
    console.log('Checking "${indexName}"');

    // Check if the index exists. If not, we create it
    const existingIndexes = await client.listIndexes();

    if(!existingIndexes.includes(indexName)){
        
        // Index not present so we create it
        await client.createIndex({
            createRequest:{
                name: indexName,
                dimension: vectorDImension,
                metric: 'cosine',
            },
        });

        //Waiting for the index to be created
        await new Promise((resolve)=> setTimeout(resolve, timeout));

    }else{
        console.log('"${indexName}" already exists');
    }
    
}

// Function to upload data to the Pinecone index
export const updatePinecone =async (
    client, indexName, docs
) => {
    for(const doc of docs){
        const index = client.Index(indexName);

        console.log('Processing document : ${doc.metadata.source}');
        const txtPath = doc.metadata.source; //path on local file system
        const text = doc.pageContent; // Actual text of the document to be stored in the database

        //Now, we need to split the text in chunks to store it. Chunksize is based on documentation
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
        });
        console.log("Splitting Text into Chunks ..");
        const chunks = await textSplitter.createDocuments([text]);

        //API call to OpenAI Embeddings
        const embeddingArrays = await new OpenAIEmbeddings().embedDocuments(
            chunks.map((chunk)=> chunk.pageContent.replace(/\n/g, " "))
        );

        console.log("Adding embeddings from OpenAI to Pinecone");
        const batchSize = 100;  //recommended size to upload on Pinecone
        let batch:any = [];
        for (let  idx = 0;  idx < chunks.length;  idx++) {
            const chunk = chunks[ idx];
            
            const vector = {
                id: '${txtPath}_${idx}',
                values: embeddingArrays[idx],
                metadata: {
                    ...chunk.metadata,
                    loc: JSON.stringify(chunk.metadata.loc),
                    pageContent: chunk.pageContent,
                    txtPath: txtPath,
                },
            };

            // Push vector to the batch array
            batch = [...batch, vector]

            //Once we reach desired batchsize, we add it to our Pinecone db
            if(batch.length === batchSize || idx === chunks.length - 1){
                await index.upsert({
                    upsertRequest: {
                        vectors: batch,
                    },
                });

                //Empty the batch
                batch = [];
            }
        }
    }
}

// Function to query the Pinecone db
export const queryPinecone =async (
    client, indexName, question
) => {
    const index = client.Index(indexName);

    // Get embedding for the query
    const queryEmbedding = await new OpenAIEmbeddings().embedQuery(question);

    let queryResponse = index.query({
        queryRequest: {
            topK: 10,
            vector: queryEmbedding,
            includeMetadata: true,
            includeValues: true,
        },
    });

    console.log('Found ${queryResponse.matches.length} matches'); // should be 10, because that's what we specified

    if (queryResponse.matches.length){
        const llm = new OpenAI({});
        const chain = loadQAStuffChain(llm);

        const concatContent = queryResponse.matches
        .map((match)=> match.metadata.pageContent).join(" ");

        const result = await chain.call({
            input_documents: [new Document({pageContent: concatContent})],
            question: question,
        });
        
        console.log('Answer: ${result.text}');
        return result.text 
         
    }else{
        console.log('There are no matches');
    }
    
}   