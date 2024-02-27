import {Connection, PublicKey, Keypair} from '@solana/web3.js'
import {createAccount, TOKEN_2022_PROGRAM_ID} from '@solana/spl-token'

export async function createAccountForTransaction(
	connection: Connection,
	payer: Keypair,
	mint: PublicKey,
	owner: PublicKey
): Promise<PublicKey> {
	const account = await createAccount(
		connection,
		payer,
		mint,
		owner,
		undefined,
		{commitment: 'finalized'},
		TOKEN_2022_PROGRAM_ID
	)

	return account
}
