import {  EncodeURLComponents } from "@solana/pay";
import { Keypair } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import BackLink from "../../components/BackLink";
import PageHeading from "../../components/PageHeading";
import QrCode from "../../components/QrCode"
import { shopAddress, usdcAddress } from "../../lib/addresses";
import calculatePrice from "../../lib/calculatePrice";
import { decrypt} from "../../lib/openssl_crypto";

export default function Checkout() {
  const router = useRouter()

  const reference = useMemo(() => Keypair.generate().publicKey, [])


  const params = useMemo(() => {
  const { token } = router.query

    if (token) {
      const tokenString = String(token).trim().replaceAll(" ", "+")
      return JSON.parse(decrypt(tokenString as string))
    } else {
      return router.query
    }
  }, [router.query]);

  const amount = useMemo(() => {
    const { token } = router.query

    if(token) {
      const tokenString = String(token).trim().replaceAll(" ", "+")
      const queryParams = JSON.parse(decrypt(tokenString as string))
      return calculatePrice(queryParams)
    } else {
      return calculatePrice(router.query)
    }
  }, [router.query])


  // Solana Pay transfer params
  const urlParams: EncodeURLComponents = {
    recipient: shopAddress,
    splToken: usdcAddress,
    amount,
    reference,
    label: params.label,
    message: 'Thanks for your order! 🍪 ',
  }

  useEffect(() => {
    if (params) {
      const {
        box_of_cookies,
        basket_of_cookies,
        recipient,
        label,
        recipient1,
        percent,
        percent1,
        amount,
        country,
        city,
        secret,
      } = params

      console.log(box_of_cookies)
      console.log(basket_of_cookies)
      console.log(reference)
      console.log(recipient)
      console.log(label)
      console.log(recipient1)
      console.log(percent1)
      console.log(amount)
      console.log(country)
      console.log(city)
      console.log(secret)
    }
  }, [params])


  return (
    <div className="flex flex-col items-center gap-8">
      <BackLink href="/shop">Cancel</BackLink>
      <PageHeading>{params.label} ${amount.toString()}</PageHeading>

      <QrCode urlParams={urlParams} />
    </div>
  )
}
