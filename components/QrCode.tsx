import { FC, useEffect, useMemo, useRef, useState } from 'react'
import {
  createQR,
  encodeURL,
  EncodeURLComponents,
  findTransactionSignature,
  FindTransactionSignatureError,
  validateTransactionSignature,
  ValidateTransactionSignatureError,
} from '@solana/pay'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { clusterApiUrl, Connection, Keypair, PublicKey } from '@solana/web3.js'
import BigNumber from 'bignumber.js'
import { time } from 'console'
import { useRouter } from 'next/router'
import BackLink from '../components/BackLink'
import PageHeading from '../components/PageHeading'
import { shopAddress, usdcAddress } from '../lib/addresses'
import calculatePrice from '../lib/calculatePrice'
import { encrypt, decrypt } from '../lib/openssl_crypto'

interface Props {
  urlParams: EncodeURLComponents
}

const QrCode: FC<Props> = (props) => {
  const { urlParams } = props
  const router = useRouter()
  // Get a connection to Solana devnet
  const network = WalletAdapterNetwork.Devnet
  const endpoint = clusterApiUrl(network)
  const connection = new Connection(endpoint)
  const qrRef = useRef<HTMLDivElement>(null)

  // Show the QR code
  useEffect(() => {
    const url = encodeURL(urlParams)
    const qr = createQR(url, 512, 'transparent')
    if (qrRef.current && urlParams.amount?.isGreaterThan(0)) {
      qrRef.current.innerHTML = ''
      qr.append(qrRef.current)
    }
  })

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (urlParams.reference) {
          // Check if there is any transaction for the reference
          const signatureInfo = await findTransactionSignature(
            connection,
            urlParams.reference as PublicKey,
            {},
            'confirmed' //If you’re dealing with really big transactions you might prefer to use 'finalized' instead 'confirmed'.
          )
          // Validate that the transaction has the expected recipient, amount and SPL token
          await validateTransactionSignature(
            connection,
            signatureInfo.signature,
            shopAddress,
            urlParams.amount || new BigNumber(0),
            usdcAddress,
            urlParams.reference as PublicKey
          )
          router.push('/confirmed')
        }
      } catch (e) {
        if (e instanceof FindTransactionSignatureError) {
          // No transaction found yet, ignore this error
          console.log('not found yet')
          return
        }
        if (e instanceof ValidateTransactionSignatureError) {
          // Transaction is invalid
          console.error('Transaction is invalid', e)
          return
        }
        console.error('Unknown error', e)
      }
    }, 500)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return <div ref={qrRef} />
}

export default QrCode
