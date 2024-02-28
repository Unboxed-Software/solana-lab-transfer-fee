import {Cluster, Connection, clusterApiUrl, Keypair} from '@solana/web3.js'
import {initializeKeypair} from './keypair-helpers'
import {createMintWithTransferFee} from './create-mint'
import {mintToken} from './mint-token'
import {createAccountForTransaction} from './create-account'
import {
	getAccountsToWithdrawFrom,
	harvestTokens,
	transferWithFee,
	withdrawFromMintToAccount,
	withdrawWithheldTokens,
} from './transfers'
import {
	TOKEN_2022_PROGRAM_ID,
	createAssociatedTokenAccount,
} from '@solana/spl-token'

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

	/**
	 * Creating a mint with transfer fees
	 */
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

	/**
	 * An account to collect fees
	 */
	console.log('\nCreating a fee vault account...')
	const feeVaultKeypair = Keypair.generate()
	const feeVaultAccount = await createAssociatedTokenAccount(
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		feeVaultKeypair.publicKey,
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)
	var balance = await (
		await connection.getTokenAccountBalance(feeVaultAccount, 'finalized')
	).value.amount
	console.log('Current fee vault balance: ' + balance)

	/**
	 * Creating a source account for a transfer and minting 1 token to that account
	 */
	console.log()
	const sourceKeypair = Keypair.generate()
	const sourceAccount = await mintToken(
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		sourceKeypair.publicKey
	)

	/**
	 * Creating a destination account for a transfer
	 */
	console.log()
	console.log('Creating a destination account...')
	const destinationKeypair = Keypair.generate()
	const destinationAccount = await createAccountForTransaction(
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		sourceKeypair.publicKey,
		destinationKeypair
	)

	/**
	 * Transferring 1 token from the source account to the destination account
	 */
	console.log()
	await transferWithFee(
		CLUSTER,
		feeBasisPoints,
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		sourceAccount,
		destinationAccount,
		sourceKeypair.publicKey,
		decimals,
		[sourceKeypair, destinationKeypair]
	)

	/**
	 * There are 2 ways to withdraw fees
	 *  - Get a list of all accounts to withdraw from and then withdraw to the fee vault account
	 *  - Harvest from the recipient account to the mint account and then withdraw to the fee vault account
	 */

	/**
	 * 1. Get a list of accounts to withdraw from and then withdraw to the fee vault account
	 */
	console.log()
	console.log('Getting all accounts to withdraw from...')
	const accountsToWithdrawFrom = await getAccountsToWithdrawFrom(
		connection,
		mintKeypair.publicKey
	)
	console.log('Accounts: ', accountsToWithdrawFrom)
	console.log()
	await withdrawWithheldTokens(
		CLUSTER,
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		feeVaultAccount,
		mintOwnerUser.publicKey,
		accountsToWithdrawFrom
	)
	console.log()
	balance = (
		await connection.getTokenAccountBalance(feeVaultAccount, 'finalized')
	).value.amount
	console.log('Current fee vault balance: ' + balance)

	/**
	 * 2. Harvest from the recipient account to the mint account and then withdraw to the fee vault account
	 */
	console.log()
	await harvestTokens(
		CLUSTER,
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		destinationAccount
	)

	console.log()
	await withdrawFromMintToAccount(
		CLUSTER,
		connection,
		mintOwnerUser,
		mintKeypair.publicKey,
		feeVaultAccount,
		mintOwnerUser.publicKey
	)
	console.log()
	balance = (
		await connection.getTokenAccountBalance(feeVaultAccount, 'finalized')
	).value.amount
	console.log('Current fee vault balance: ' + balance)
}

main()
