import {Connection, PublicKey, Keypair} from '@solana/web3.js'
import {createAccount, TOKEN_2022_PROGRAM_ID} from '@solana/spl-token'

export async function createAccountForTransaction(
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	owner: PublicKey,
	keypairForAta?: Keypair
): Promise<PublicKey> {
	const account = await createAccount(
		connection,
		payer,
		mint,
		owner,
		keypairForAta,
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	return account
}
