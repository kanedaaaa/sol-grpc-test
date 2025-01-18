import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import config from "./config.js";

const geyserProtoPath = "./protos/geyser.proto";
const solanaStorageProtoPath = "./protos/solana-storage.proto";

const geyserDefinition = protoLoader.loadSync(geyserProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const storageDefinition = protoLoader.loadSync(solanaStorageProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const geyserProto = grpc.loadPackageDefinition(geyserDefinition).geyser;

const GRPC_ENDPOINT = config.rpc;

const geyserClient = new geyserProto.Geyser(
  GRPC_ENDPOINT,
  grpc.credentials.createInsecure()
);

async function testGetLatestBlockhash() {
  return new Promise((resolve, reject) => {
    geyserClient.GetLatestBlockhash({}, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

async function testSubscribe() {
  return new Promise((resolve, reject) => {
    const call = geyserClient.Subscribe();

    call.write({
      accounts: {
        usdc: {
          account: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
        },
      },
    });

    call.on("data", (data) => {
      console.log("Subscription update:", data);
    });

    call.on("error", (error) => {
      reject(error);
    });

    call.on("end", () => {
      resolve();
    });

    setTimeout(() => {
      call.end();
      console.log("Subscription ended.");
    }, 10000);
  });
}

(async () => {
  try {
    console.log(`Testing gRPC methods on ${GRPC_ENDPOINT}`);

    const latestBlockhash = await testGetLatestBlockhash();
    console.log("Latest Blockhash:", latestBlockhash);

    console.log("Starting Subscription...");
    await testSubscribe();
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
