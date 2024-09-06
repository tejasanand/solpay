import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { encodeURL, findReference, validateTransfer } from "@solana/pay";
import BigNumber from "bignumber.js";

const walletAddress = process.env.NEXT_PUBLIC_SOLANA_WALLET_ADDRESS;
if (!walletAddress) {
  throw new Error("Wallet address is not defined in environment variables.");
}
const recipientAddress = new PublicKey(walletAddress);
const paymentLabel = "Treikto Token";
const paymentMemo = "Buy for Powers";
const pricePerkW = new BigNumber(0.0001); // 0.0001 SOL

const paymentMap = new Map<
  string,
  { recipient: PublicKey; amount: BigNumber; memo: string }
>();

export async function POST(request: Request) {
  try {
    const { kwAmount } = await request.json();
    const totalAmount = pricePerkW.multipliedBy(kwAmount);
    const paymentReference = new Keypair().publicKey;
    const paymentMessage = `Treikto Token of ${totalAmount} bought`;
    const urlData = await createPaymentUrl(
      recipientAddress,
      totalAmount,
      paymentReference,
      paymentLabel,
      paymentMessage,
      paymentMemo
    );
    const referenceString = paymentReference.toBase58();
    paymentMap.set(referenceString, {
      recipient: recipientAddress,
      amount: totalAmount,
      memo: paymentMemo,
    });
    const { url } = urlData;
    return Response.json({ url, ref: referenceString });
  } catch (error) {
    console.error("Error occurred:", error);
    return Response.json({ error: "Internal Server Error" });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");
  if (!reference) {
    return Response.json({ error: "Reference is missing" });
  }

  try {
    const referenceKey = new PublicKey(reference);
    const verificationResponse = await checkTransaction(referenceKey);
    if (verificationResponse) {
      return Response.json({ status: "verified" });
    } else {
      return Response.json({ status: "not found" });
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return Response.json({ error: "Internal Server Error" });
  }
}

async function createPaymentUrl(
  recipient: PublicKey,
  amount: BigNumber,
  reference: PublicKey,
  label: string,
  message: string,
  memo: string
) {
  const url: URL = encodeURL({
    recipient,
    amount,
    reference,
    label,
    message,
    memo,
  });
  return { url };
}

async function checkTransaction(reference: PublicKey) {
  const paymentDetails = paymentMap.get(reference.toBase58());
  if (!paymentDetails) {
    throw new Error("Payment request not found");
  }
  const { recipient, amount, memo } = paymentDetails;

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const foundTransaction = await findReference(connection, reference);
  console.log(foundTransaction.signature);

  const response = await validateTransfer(
    connection,
    foundTransaction.signature,
    {
      recipient,
      amount,
      splToken: undefined,
      reference,
    },
    { commitment: "confirmed" }
  );

  if (response) {
    paymentMap.delete(reference.toBase58());
  }
  return response;
}
