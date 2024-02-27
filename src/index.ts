import {Cluster, Connection, clusterApiUrl, Keypair} from '@solana/web3.js'
import {initializeKeypair} from './keypair-helpers'
import {createMintWithTransferFee} from './create-mint'
import {mintToken} from './mint-token'
import {createAccountForTransaction} from './create-account'
import {
	getAccountsToWithdrawFrom,
	harvestTokens,
	transferWithFee,
	withdrawWithheldTokens,
} from './transfer-token'

const CLUSTER: Cluster = 'devnet'

async function main() {
	/**
	 * Create a connection and initialize a keypair if one doesn't already exists.
	 * If a keypair exists, airdrop a sol if needed.
	 */
	const connection = new Connection(clusterApiUrl(CLUSTER))
	const mintOwnerUser = await initializeKeypair(connection)

	console.log(`public key: ${mintOwnerUser.publicKey.toBase58()}`)

	const mintKeypair = Keypair.generate()

	console.log('\nmint public key: ' + mintKeypair.publicKey.toBase58())

	console.log()
	const decimals = 9
	const feeBasisPoints = 50
	const maxFee = BigInt(5000)
	await createMintWithTransferFee(
		CLUSTER,
		connection,
		mintOwnerUser,
		mintKeypair,
		decimals,
		feeBasisPoints,
		maxFee
	)

	console.log()
	const sourceAccount = await mintToken(
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		mintOwnerUser.publicKey
	)

	console.log()
	console.log('Creating a destination account...')
	const destinationKeypair = Keypair.generate()
	const destinationAccount = await createAccountForTransaction(
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		destinationKeypair.publicKey
	)
	console.log('Destination account: ', destinationAccount)

	console.log()
	const transferTransactionSignature = await transferWithFee(
		CLUSTER,
		feeBasisPoints,
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		sourceAccount,
		destinationAccount,
		mintOwnerUser.publicKey,
		decimals
	)

	console.log()
	console.log('Getting all accounts to withdraw from...')
	const accountsToWithdrawFrom = await getAccountsToWithdrawFrom(
		connection,
		mintKeypair.publicKey
	)
	console.log('Accounts: ', accountsToWithdrawFrom)
	await withdrawWithheldTokens(
		CLUSTER,
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		destinationAccount,
		mintOwnerUser.publicKey
	)

	console.log()
	await harvestTokens(
		CLUSTER,
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		destinationAccount
	)
}

main()
