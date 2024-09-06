"use client";
import { createQR } from "@solana/pay";
import Head from "next/head";
import Image from "next/image";
import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function PurchaseToken() {
  const [qrCodeImage, setQrCodeImage] = useState<string>();
  const [paymentReference, setPaymentReference] = useState<string>();
  const [amountOfTokens, setAmountOfTokens] = useState<number>(1);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(false);
  const [attemptCount, setAttemptCount] = useState<number>(0);
  const router = useRouter();

  const tokenPrice = 0.01; // 0.01 SOL per token

  useEffect(() => {
    setTotalCost(amountOfTokens * tokenPrice);
  }, [amountOfTokens]);

  const handleGenerateQR = async () => {
    try {
      const response = await axios.post(
        "/api/pay",
        { kwAmount: amountOfTokens },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      const { url, ref } = response.data;
      const qr = createQR(url);
      const qrBlob = await qr.getRawData("png");
      if (!qrBlob) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === "string") {
          setQrCodeImage(event.target.result);
        }
      };
      reader.readAsDataURL(qrBlob);
      setPaymentReference(ref);
      setAttemptCount(0); // Reset attempt count when generating a new QR
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const verifyPayment = useCallback(
    async (ref: string) => {
      if (!ref) {
        alert("Please generate a payment request first.");
        return;
      }

      setIsChecking(true);
      let paymentVerified = false;
      let localAttemptCount = attemptCount;
      const maxAttempts = 10; // Reduced attempts for quicker checks

      while (!paymentVerified && localAttemptCount < maxAttempts) {
        try {
          const response = await axios.get(`/api/pay?reference=${ref}`);
          const { status } = response.data;
          if (status === "verified") {
            router.push("/complete");
            paymentVerified = true;
          }
          await delay(1000); // Reduced delay for quicker checks
        } catch (error) {
          console.error("Error verifying payment:", error);
        }
        localAttemptCount++;
        setAttemptCount(localAttemptCount);
      }

      if (!paymentVerified) {
        alert("Payment verification failed after multiple attempts.");
      }

      setIsChecking(false);
    },
    [router, attemptCount]
  );

  return (
    <>
      <Head>
        <title>Purchase Token</title>
        <meta name="description" content="Buy your tokens here" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex min-h-screen flex-col justify-center items-center bg-gray-800">
        <h1 className="text-3xl font-bold mb-4 text-white">Purchase Token</h1>
        {!qrCodeImage && (
          <div className="mb-4 flex items-center">
            <label htmlFor="tokenAmount" className="mr-2 text-lg text-white">
              Number of Tokens:
            </label>
            <input
              type="number"
              id="tokenAmount"
              value={amountOfTokens}
              min={1}
              onChange={(e) => setAmountOfTokens(Number(e.target.value))}
              className="p-2 border border-gray-300 rounded-md text-black"
            />
          </div>
        )}
        {qrCodeImage && (
          <div className="text-center">
            <Image
              src={qrCodeImage}
              className="rounded-lg"
              alt="QR Code"
              width={300}
              height={300}
              priority
            />
            <p className="text-sm text-gray-400">
              Scan the QR code to complete your payment
            </p>
          </div>
        )}
        <p className="text-lg text-white mb-4">
          Total Cost: {totalCost.toFixed(4)} SOL
        </p>
        {!paymentReference && (
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleGenerateQR}
          >
            Create Payment Request
          </button>
        )}
        {attemptCount >= 3 && (
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4"
            onClick={() => verifyPayment(paymentReference!)}
          >
            Check Payment Status
          </button>
        )}
      </main>
    </>
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
