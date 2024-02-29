import {
	Cluster,
	Connection,
	clusterApiUrl,
	Keypair,
	LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {initializeKeypair} from './keypair-helpers'
import {createMintWithTransferFee} from './create-mint'
import {
	TOKEN_2022_PROGRAM_ID,
	createAccount,
	createAssociatedTokenAccount,
	getTransferFeeAmount,
	harvestWithheldTokensToMint,
	mintTo,
	transferCheckedWithFee,
	unpackAccount,
	withdrawWithheldTokensFromAccounts,
	withdrawWithheldTokensFromMint,
} from '@solana/spl-token'

const CLUSTER: Cluster = 'devnet'

async function main() {
	/**
	 * Create a connection and initialize a keypair if one doesn't already exists.
	 * If a keypair exists, airdrop a sol if needed.
	 */
	const connection = new Connection(clusterApiUrl(CLUSTER))
	const payer = await initializeKeypair(connection)

	console.log(`public key: ${payer.publicKey.toBase58()}`)

	const mintKeypair = Keypair.generate()
	const mint = mintKeypair.publicKey
	console.log(
		'\nmint public key: ' + mintKeypair.publicKey.toBase58() + '\n\n'
	)

	/**
	 * Creating a mint with transfer fees
	 */
	const decimals = 9
	const feeBasisPoints = 50
	const maxFee = BigInt(5000)

	await createMintWithTransferFee(
		CLUSTER,
		connection,
		payer,
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
		payer,
		mintKeypair.publicKey,
		feeVaultKeypair.publicKey,
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)
	var balance = await (
		await connection.getTokenAccountBalance(feeVaultAccount, 'finalized')
	).value.amount
	console.log('Current fee vault balance: ' + balance + '\n\n')

	/**
	 * Creating a source account for a transfer and minting 1 token to that account
	 */
	console.log('Creating a source account...')
	const sourceKeypair = Keypair.generate()
	const sourceAccount = await createAccount(
		connection,
		payer,
		mint,
		sourceKeypair.publicKey,
		undefined,
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	console.log('Minting 1 token...\n\n')
	const amount = 1 * LAMPORTS_PER_SOL
	await mintTo(
		connection,
		payer,
		mint,
		sourceAccount,
		payer,
		amount,
		[payer],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	/**
	 * Creating a destination account for a transfer
	 */
	console.log('Creating a destination account...\n\n')
	const destinationKeypair = Keypair.generate()
	const destinationAccount = await createAccount(
		connection,
		payer,
		mint,
		destinationKeypair.publicKey,
		undefined,
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	/**
	 * Transferring 1 token from the source account to the destination account
	 */
	console.log('Transferring with fee transaction...')
	const transferAmount = BigInt(1_000_000)
	const fee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000)
	var signature = await transferCheckedWithFee(
		connection,
		payer,
		sourceAccount,
		mint,
		destinationAccount,
		sourceKeypair.publicKey,
		transferAmount,
		decimals,
		fee,
		[sourceKeypair, destinationKeypair],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)
	console.log(
		`Check the transaction at: https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER} \n\n`
	)

	/**
	 * There are 2 ways to withdraw fees
	 *  - Get a list of all accounts to withdraw from and then withdraw to the fee vault account
	 *  - Harvest from the recipient account to the mint account and then withdraw to the fee vault account
	 */

	/**
	 * 1. Get a list of accounts to withdraw from and then withdraw to the fee vault account
	 */
	console.log('Getting all accounts to withdraw from...')
	const accounts = await connection.getProgramAccounts(
		TOKEN_2022_PROGRAM_ID,
		{
			commitment: 'finalized',
			filters: [
				{
					memcmp: {
						offset: 0,
						bytes: mint.toString(),
					},
				},
			],
		}
	)

	const accountsToWithdrawFrom = []
	for (const accountInfo of accounts) {
		const unpackedAccount = unpackAccount(
			accountInfo.pubkey,
			accountInfo.account,
			TOKEN_2022_PROGRAM_ID
		)

		const transferFeeAmount = getTransferFeeAmount(unpackedAccount)
		if (
			transferFeeAmount != null &&
			transferFeeAmount.withheldAmount > BigInt(0)
		) {
			accountsToWithdrawFrom.push(accountInfo.pubkey)
		}
	}

	console.log('Accounts to withdraw from: ', accountsToWithdrawFrom, '\n\n')
	console.log('Withdrawing withheld tokens...')
	signature = await withdrawWithheldTokensFromAccounts(
		connection,
		payer,
		mint,
		feeVaultAccount,
		payer.publicKey,
		[],
		accountsToWithdrawFrom,
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	console.log(
		`Check the transaction at: https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER} \n\n`
	)

	balance = (
		await connection.getTokenAccountBalance(feeVaultAccount, 'finalized')
	).value.amount
	console.log('Current fee vault balance: ' + balance + '\n\n')

	/**
	 * 2. Harvest from the recipient account to the mint account and then withdraw to the fee vault account
	 */
	console.log('Harvesting withheld tokens...')
	signature = await harvestWithheldTokensToMint(
		connection,
		payer,
		mint,
		[destinationAccount],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	console.log(
		`Check the transaction at: https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER} \n\n`
	)

	console.log('Withdrawing from mint to fee vault account...')
	signature = await withdrawWithheldTokensFromMint(
		connection,
		payer,
		mint,
		feeVaultAccount,
		payer.publicKey,
		[],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	console.log(
		`Check the transaction at: https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER} \n\n`
	)

	balance = (
		await connection.getTokenAccountBalance(feeVaultAccount, 'finalized')
	).value.amount
	console.log('Current fee vault balance: ' + balance)
}

main()
