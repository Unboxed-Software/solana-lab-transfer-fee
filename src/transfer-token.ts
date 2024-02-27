import {
	Cluster,
	Connection,
	PublicKey,
	Keypair,
	TransactionSignature,
} from '@solana/web3.js'
import {
	transferCheckedWithFee,
	TOKEN_2022_PROGRAM_ID,
	unpackAccount,
	getTransferFeeAmount,
	withdrawWithheldTokensFromAccounts,
	harvestWithheldTokensToMint,
} from '@solana/spl-token'

export async function transferWithFee(
	cluster: Cluster,
	feeBasisPoints: number,
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	sourceAccount: PublicKey,
	destinationAccount: PublicKey,
	sourceOwner: PublicKey,
	decimals: number
): Promise<TransactionSignature> {
	const transferAmount = BigInt(1_000_000)
	const fee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000)

	console.log('Transferring with fee transaction...')
	const signature = await transferCheckedWithFee(
		connection,
		payer,
		sourceAccount,
		mint,
		destinationAccount,
		sourceOwner,
		transferAmount,
		decimals,
		fee,
		[],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)
	console.log(
		`Check the transaction at: https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
	)

	return signature
}

export async function getAccountsToWithdrawFrom(
	connection: Connection,
	mint: PublicKey
): Promise<PublicKey[]> {
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

	return accountsToWithdrawFrom
}

export async function withdrawWithheldTokens(
	cluster: Cluster,
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	destinationAccount: PublicKey,
	withdrawWithheldAuthority: PublicKey
): Promise<TransactionSignature> {
	console.log('Withdrawing withheld tokens...')
	const signature = await withdrawWithheldTokensFromAccounts(
		connection,
		payer,
		mint,
		destinationAccount,
		withdrawWithheldAuthority,
		[],
		[destinationAccount],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	console.log(
		`Check the transaction at: https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
	)

	return signature
}

export async function harvestTokens(
	cluster: Cluster,
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	destinationAccount: PublicKey
): Promise<TransactionSignature> {
	console.log('Harvesting withheld tokens...')
	const signature = await harvestWithheldTokensToMint(
		connection,
		payer,
		mint,
		[destinationAccount],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	console.log(
		`Check the transaction at: https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
	)

	return signature
}
