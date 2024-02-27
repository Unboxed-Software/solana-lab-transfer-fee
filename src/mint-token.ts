import {Connection, PublicKey, Keypair, LAMPORTS_PER_SOL} from '@solana/web3.js'
import {mintTo, TOKEN_2022_PROGRAM_ID} from '@solana/spl-token'
import {createAccountForTransaction} from './create-account'

export async function mintToken(
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	owner: PublicKey
): Promise<PublicKey> {
	console.log('Creating a source account...')
	const sourceAccount = await createAccountForTransaction(
		connection,
		payer,
		mint,
		owner
	)

	console.log('Minting 1 token...')
	await mintTo(
		connection,
		payer,
		mint,
		sourceAccount,
		payer,
		1 * LAMPORTS_PER_SOL,
		[payer],
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	return sourceAccount
}
