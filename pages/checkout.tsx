import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Keypair, Transaction } from '@solana/web3.js'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import BackLink from '../components/BackLink'
import Loading from '../components/Loading'
import {
  MakeTransactionInputData,
  MakeTransactionOutputData,
} from './api/makeTransaction'
import {
  findTransactionSignature,
  FindTransactionSignatureError,
} from '@solana/pay'
import { decode as decodeBase64, encode as encodeBase64 } from 'js-base64'

export default function Checkout() {
  const router = useRouter()
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  // State to hold API response fields
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const { token } = router.query
  const params = useMemo(() => {
    if (token) {
      return JSON.parse(decodeBase64(token as string))
    } else {
      return router.query
    }
  }, [router.query])

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

  // Generate the unique reference which will be used for this transaction
  const reference = useMemo(() => Keypair.generate().publicKey, [])

  // Use our API to fetch the transaction for the selected items
  async function getTransaction() {
    if (!publicKey || !params) {
      return
    }
    const body: MakeTransactionInputData = {
      account: publicKey.toString(),
    }

    let response

    if (token) {
      const tokenString = encodeBase64(
        JSON.stringify({
          ...params,
          reference,
        })
      )

      response = await fetch(`/api/makeTransaction?token=${tokenString}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
    } else {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) {
              searchParams.append(key, v)
            }
          } else {
            searchParams.append(key, value as string)
          }
        }
      }

      // Add reference to the params we'll pass to the API
      searchParams.append('reference', reference.toString())
      response = await fetch(
        `/api/makeTransaction?${searchParams.toString()}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )
    }

    const json = (await response.json()) as MakeTransactionOutputData

    if (response.status !== 200) {
      console.error(json)
      return
    }

    // Deserialize the transaction from the response
    const transaction = Transaction.from(
      Buffer.from(json.transaction, 'base64')
    )
    setTransaction(transaction)
    setMessage(json.message)
  }

  useEffect(() => {
    getTransaction()
  }, [publicKey])

  const handleSignatureStatus = async (signature: string) => {
    try {
      const result = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      })
      if (result.value?.confirmationStatus === 'confirmed') {
        const response = await fetch(
          'https://webhook.site/f427d3f6-0313-4bed-a8d7-0fcd831f166f',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...params,
              signature,
            }),
          }
        )
        if (response.status === 200) {
          router.push('/confirmed')
        } else {
          alert('Can not set parameter to webhook, checkout your connection.')
        }
        return
      }
      handleSignatureStatus(signature)
    } catch (error) {
      console.log(error)
    }
  }

  async function trySendTransaction() {
    if (!transaction) {
      return
    }
    try {
      const signature = await sendTransaction(transaction, connection)
      handleSignatureStatus(signature)
    } catch (e) {
      console.error(e)
    }
  }

  // Send the transaction once it's fetched
  useEffect(() => {
    trySendTransaction()
  }, [transaction])

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center gap-8">
        <div>
          <BackLink href="/">Cancel</BackLink>
        </div>

        <WalletMultiButton />

        <p>You need to connect your wallet to make transactions</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div>
        <BackLink href="/">Cancel</BackLink>
      </div>

      <WalletMultiButton />

      {message ? (
        <p>{message} Please approve the transaction using your wallet</p>
      ) : (
        <p>
          Creating transaction... <Loading />
        </p>
      )}
    </div>
  )
}
