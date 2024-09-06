"use client";
import { createQR } from "@solana/pay";
import Head from "next/head";
import Image from "next/image";
import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function BuyTreiktoToken() {
  const [qrCode, setQrCode] = useState<string>();
  const [reference, setReference] = useState<string>();
  const [tokenAmount, setTokenAmount] = useState<number>(1);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const router = useRouter();

  const ratePerToken = 0.01; // 0.01 SOL per Treikto Token

  useEffect(() => {
    setTotalAmount(tokenAmount * ratePerToken);
  }, [tokenAmount]);

  const handleGenerateClick = async () => {
    try {
      const res = await axios.post(
        "/api/pay",
        { tokenAmount },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const { url, ref } = res.data;
      const qr = createQR(url);
      const qrBlob = await qr.getRawData("png");
      if (!qrBlob) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setQrCode(event.target.result);
        }
      };
      reader.readAsDataURL(qrBlob);
      setReference(ref);
      handleVerify(ref);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleVerify = useCallback(
    async (ref: string) => {
      if (!ref) {
        alert("Please generate a payment request first");
        return;
      }

      setIsVerifying(true);
      let wentThrough = false;
      let localRetryCount = retryCount;
      const maxRetries = 25;

      while (!wentThrough && localRetryCount < maxRetries) {
        try {
          const res = await axios.get(`/api/pay?reference=${ref}`);
          const { status } = res.data;
          if (status === "verified") {
            router.push("/success");
            wentThrough = true;
          }
          await delay(Math.min(1000 * Math.pow(2, localRetryCount), 1000 * 15));
        } catch (error) {
          console.error("Error verifying payment:", error);
        }
        localRetryCount++;
        setRetryCount(localRetryCount);
      }

      if (!wentThrough) {
        alert("Failed to verify payment after multiple attempts.");
      }

      setIsVerifying(false);
    },
    [router, retryCount]
  );

  return (
    <>
      <Head>
        <title>Buy Treikto Token</title>
        <meta name="description" content="Purchase Treikto Token" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex min-h-screen flex-col justify-center items-center bg-[#0f0f0f]">
        <h1 className="text-2xl font-semibold mb-4">Buy Treikto Token</h1>
        {!qrCode && (
          <div className="mb-4 flex items-center">
            <label htmlFor="tokenAmount" className="mr-2 text-lg">
              Amount of Tokens:
            </label>
            <input
              type="number"
              id="tokenAmount"
              value={tokenAmount}
              min={1}
              onChange={(e) => setTokenAmount(Number(e.target.value))}
              className="p-2 border border-gray-300 rounded-md text-black"
            />
          </div>
        )}
        {qrCode && (
          <div className="text-center">
            <Image
              src={qrCode}
              className="rounded-lg"
              alt="QR Code"
              width={300}
              height={300}
              priority
            />
            <p className="text-sm text-gray-500">
              Scan the QR code to make a payment
            </p>
          </div>
        )}
        <p className="text-lg text-white mb-4">
          Total Amount: {totalAmount.toFixed(4)} SOL
        </p>
        {!reference && (
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleGenerateClick}
          >
            Generate Payment Request
          </button>
        )}
        {retryCount >= 3 && (
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
            onClick={() => handleVerify(reference!)}
          >
            Verify Payment
          </button>
        )}
      </main>
    </>
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
