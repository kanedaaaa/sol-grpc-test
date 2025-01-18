import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { performance } from "perf_hooks";
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

// geyser definitions are enough to make sense of the actual latency
// but imma leave the definition for later
// just be aware this isn't measured
const _storageDefinition = protoLoader.loadSync(solanaStorageProtoPath, {
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
  const start = performance.now();
  return new Promise((resolve, reject) => {
    geyserClient.GetLatestBlockhash({}, (error, response) => {
      const end = performance.now();
      if (error) {
        reject({ error, time: end - start });
      } else {
        resolve({ response, time: end - start });
      }
    });
  });
}

async function testGetBlockHeight() {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    geyserClient.GetBlockHeight({}, (error, response) => {
      const end = performance.now();
      if (error) {
        reject({ error, time: end - start });
      } else {
        resolve({ response, time: end - start });
      }
    });
  });
}

async function testGetSlot() {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    geyserClient.GetSlot({}, (error, response) => {
      const end = performance.now();
      if (error) {
        reject({ error, time: end - start });
      } else {
        resolve({ response, time: end - start });
      }
    });
  });
}

async function testSubscribe() {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const call = geyserClient.Subscribe();

    call.write({
      accounts: {
        usdc: {
          account: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
        },
      },
    });

    call.on("data", (data) => {
      const end = performance.now();
      console.log("Subscription update received:", data);
      console.log(`Response time: ${(end - start).toFixed(2)} ms`);
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

    console.log("Testing GetLatestBlockhash...");
    const latestBlockhash = await testGetLatestBlockhash();
    if (latestBlockhash.error) {
      console.error(
        "Error fetching latest blockhash:",
        latestBlockhash.error.message
      );
    } else {
      console.log(
        "Latest Blockhash Response:",
        latestBlockhash.response,
        `Response time: ${latestBlockhash.time.toFixed(2)} ms`
      );
    }

    console.log("Testing GetBlockHeight...");
    const blockHeight = await testGetBlockHeight();
    if (blockHeight.error) {
      console.error("Error fetching block height:", blockHeight.error.message);
    } else {
      console.log(
        "Block Height Response:",
        blockHeight.response,
        `Response time: ${blockHeight.time.toFixed(2)} ms`
      );
    }

    console.log("Testing GetSlot...");
    const slot = await testGetSlot();
    if (slot.error) {
      console.error("Error fetching slot:", slot.error.message);
    } else {
      console.log(
        "Slot Response:",
        slot.response,
        `Response time: ${slot.time.toFixed(2)} ms`
      );
    }

    console.log("Starting Subscription...");
    await testSubscribe();
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
