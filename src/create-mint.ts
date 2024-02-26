
import {
    Cluster,
    sendAndConfirmTransaction,
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    LAMPORTS_PER_SOL,
    TransactionSignature
} from '@solana/web3.js';

import { 
  ExtensionType,
  createInitializeMintInstruction,
  mintTo,
  createAccount,
  getMintLen,
  TOKEN_2022_PROGRAM_ID, createInitializeTransferFeeConfigInstruction,
  harvestWithheldTokensToMint,
  transferCheckedWithFee,
  withdrawWithheldTokensFromAccounts,
  withdrawWithheldTokensFromMint } from "@solana/spl-token"

export async function createMintWithTransferFee(
  cluster: Cluster,
  connection: Connection,
  payer: Keypair,
  mintKeypair: Keypair,
  decimals: number
): Promise<TransactionSignature> {

  const extensions = [ExtensionType.TransferFeeConfig]
  const mintLength = getMintLen(extensions);
  
  const feeBasisPoints =  50
  const maxFee = BigInt(5000)

  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLength)

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLength,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID
    }),
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      payer.publicKey,
      payer.publicKey,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID
    ),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID
    )
  )

  const signature = await sendAndConfirmTransaction(connection, mintTransaction, [payer, mintKeypair], { commitment: "finalized"})

  return signature
}
