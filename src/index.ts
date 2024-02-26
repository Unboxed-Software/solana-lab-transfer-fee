import {Cluster, Connection, clusterApiUrl, PublicKey, Keypair} from '@solana/web3.js'
import {initializeKeypair} from './keypair-helpers'
import {createMintWithTransferFee} from "./create-mint"

const CLUSTER: Cluster = 'devnet'

async function main() {

	/**
	 * Create a connection and initialize a keypair if one doesn't already exists.
	 * If a keypair exists, airdrop a sol if needed.
	 */
	const connection = new Connection(clusterApiUrl(CLUSTER))
	const keyPair = await initializeKeypair(connection)

	console.log(`public key: ${keyPair.publicKey.toBase58()}`)

  const mintKeypair = Keypair.generate()

  console.log("mint secret: " + mintKeypair.secretKey.toString())

  const signature = await createMintWithTransferFee(CLUSTER, connection, keyPair, mintKeypair, 9)

  console.log("Transaction signature: ", signature)
}

main()
