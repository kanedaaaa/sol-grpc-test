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

// be aware this isn't measured, the geyser definitions alone are enough
// to make sense of the possible latency
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
  return new Promise((resolve) => {
    geyserClient.GetLatestBlockhash({}, (error, response) => {
      const end = performance.now();
      resolve({
        name: "GetLatestBlockhash",
        error,
        response,
        time: end - start,
      });
    });
  });
}

async function testGetBlockHeight() {
  const start = performance.now();
  return new Promise((resolve) => {
    geyserClient.GetBlockHeight({}, (error, response) => {
      const end = performance.now();
      resolve({ name: "GetBlockHeight", error, response, time: end - start });
    });
  });
}

async function testGetSlot() {
  const start = performance.now();
  return new Promise((resolve) => {
    geyserClient.GetSlot({}, (error, response) => {
      const end = performance.now();
      resolve({ name: "GetSlot", error, response, time: end - start });
    });
  });
}

async function testSubscribe() {
  return new Promise((resolve) => {
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
      resolve({ name: "Subscribe", data, time: end - start });
      call.end();
    });

    call.on("error", (error) => {
      resolve({ name: "Subscribe", error, time: null });
      call.end();
    });

    setTimeout(() => {
      resolve({ name: "Subscribe", error: new Error("Timeout"), time: null });
      call.end();
    }, 10000);
  });
}

(async () => {
  const results = [];

  results.push(await testGetLatestBlockhash());
  results.push(await testGetBlockHeight());
  results.push(await testGetSlot());

  const subscriptionResults = [];
  for (let i = 0; i < 3; i++) {
    subscriptionResults.push(await testSubscribe());
  }
  results.push(...subscriptionResults);

  const report = results.map(({ name, error, response, time, data }) => ({
    name,
    success: !error,
    time: time ? `${time.toFixed(2)} ms` : "N/A",
    error: error ? error.message : null,
    response: response || data || null,
  }));

  console.table(report);
})();
