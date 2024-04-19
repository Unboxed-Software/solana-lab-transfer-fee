import { clusterApiUrl, Connection, Keypair } from "@solana/web3.js";
import { initializeKeypair } from "@solana-developers/helpers";
import {
	calculateFee,
	createAccount,
  createAssociatedTokenAccount,
  getAccount,
  getMint,
  getTransferFeeAmount,
  getTransferFeeConfig,
  harvestWithheldTokensToMint,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  transferChecked,
  transferCheckedWithFee,
  withdrawWithheldTokensFromAccounts,
  withdrawWithheldTokensFromMint,
} from "@solana/spl-token";
import { createMintWithTransferFee } from "./create-mint";

/**
 * Create a connection and initialize a keypair if one doesn't already exists.
 * If a keypair exists, airdrop a SOL token if needed.
 */
// const connection = new Connection(clusterApiUrl("devnet"))
const connection = new Connection("http://127.0.0.1:8899");
const payer = await initializeKeypair(connection);

console.log(`public key: ${payer.publicKey.toBase58()}`);

const mintKeypair = Keypair.generate();
const mint = mintKeypair.publicKey;
console.log("\nmint public key: " + mintKeypair.publicKey.toBase58() + "\n\n");

// CREATE MINT WITH TRANSFER FEE
const decimals = 9;
const feeBasisPoints = 1000;
const maxFee = BigInt(5000);

await createMintWithTransferFee(
  connection,
  payer,
  mintKeypair,
  decimals,
  feeBasisPoints,
  maxFee
);

// CREATE FEE VAULT ACCOUNT
console.log("\nCreating a fee vault account...");

const feeVaultAccount = await createAssociatedTokenAccount(
  connection,
  payer,
  mintKeypair.publicKey,
  payer.publicKey,
  { commitment: "finalized" },
  TOKEN_2022_PROGRAM_ID
);

const initialBalance = (
  await connection.getTokenAccountBalance(feeVaultAccount, "finalized")
).value.amount;

console.log("Current fee vault balance: " + initialBalance + "\n\n");

// CREATE TEST ACCOUNTS AND MINT TOKENS
console.log('Creating source account...')

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

console.log('Creating destination account...')

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

console.log('Minting 10 tokens to source...\n\n')

const amountToMint = 10 * (10 ** decimals)

await mintTo(
  connection,
  payer,
  mint,
  sourceAccount,
  payer,
  amountToMint,
  [payer],
  { commitment: 'finalized' },
  TOKEN_2022_PROGRAM_ID
)

// TRANSFER TOKENS
console.log('Transferring with fee transaction...')

const transferAmount = BigInt(1 * (10 ** decimals))
const basisPointFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000)
const fee = (basisPointFee > maxFee) ? maxFee : basisPointFee;

const transferSignature = await transferCheckedWithFee(
  connection,
  payer,
  sourceAccount,
  mint,
  destinationAccount,
  sourceKeypair.publicKey,
  transferAmount,
  decimals,
  fee,
  [sourceKeypair],
  { commitment: 'finalized' },
  TOKEN_2022_PROGRAM_ID
)

const sourceAccountAfterTransfer = await getAccount(
	connection,
	sourceAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const destinationAccountAfterTransfer = await getAccount(
	connection,
	destinationAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const withheldAmountAfterTransfer = getTransferFeeAmount(destinationAccountAfterTransfer);

console.log(`Source Token Balance: ${sourceAccountAfterTransfer.amount}`)
console.log(`Destination Token Balance: ${destinationAccountAfterTransfer.amount}`)
console.log(`Withheld Transfer Fees: ${withheldAmountAfterTransfer?.withheldAmount}\n`)

// DIRECTLY WITHDRAW
await withdrawWithheldTokensFromAccounts(
	connection,
	payer,
	mint,
	feeVaultAccount,
	payer.publicKey,
	[],
	[destinationAccount],
	undefined,
	TOKEN_2022_PROGRAM_ID
);

const withheldAccountAfterWithdraw = await getAccount(
	connection,
	destinationAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const withheldAmountAfterWithdraw = getTransferFeeAmount(withheldAccountAfterWithdraw);

const feeVaultAfterWithdraw = await getAccount(
	connection,
	feeVaultAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

console.log(`Withheld amount after withdraw: ${withheldAmountAfterWithdraw?.withheldAmount}`);
console.log(`Fee vault balance after withdraw: ${feeVaultAfterWithdraw.amount}\n`);

// TRANSFER TOKENS PT2
console.log('Transferring with fee transaction pt2...')

const secondTransferAmount = BigInt(1 * (10 ** decimals));
const secondTransferSignature = await transferChecked(
	connection,
	payer,
	sourceAccount,
	mint,
	destinationAccount,
	sourceKeypair,
	secondTransferAmount,
	decimals, // Can also be gotten by getting the mint account details with `getMint(...)`
	[],
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const sourceAccountAfterSecondTransfer = await getAccount(
	connection,
	sourceAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const destinationAccountAfterSecondTransfer = await getAccount(
	connection,
	destinationAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const withheldAmountAfterSecondTransfer = getTransferFeeAmount(destinationAccountAfterTransfer);

console.log(`Source Token Balance: ${sourceAccountAfterSecondTransfer.amount}`)
console.log(`Destination Token Balance: ${destinationAccountAfterSecondTransfer.amount}`)
console.log(`Withheld Transfer Fees: ${withheldAmountAfterSecondTransfer?.withheldAmount}\n`)

// HARVEST WITHHELD TOKENS TO MINT
await harvestWithheldTokensToMint(
	connection,
	payer,
	mint,
	[destinationAccount],
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const withheldAccountAfterHarvest = await getAccount(
	connection,
	destinationAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
);

const withheldAmountAfterHarvest = getTransferFeeAmount(withheldAccountAfterHarvest);

const mintAccountAfterHarvest = await getMint(
	connection,
	mint,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const mintTransferFeeConfigAfterHarvest = getTransferFeeConfig(mintAccountAfterHarvest);

console.log(`Withheld amount after harvest: ${withheldAmountAfterHarvest?.withheldAmount}`);
console.log(`Mint withheld amount after harvest: ${mintTransferFeeConfigAfterHarvest?.withheldAmount}\n`)


// WITHDRAW HARVESTED TOKENS
await withdrawWithheldTokensFromMint(
	connection,
	payer,
	mint,
	feeVaultAccount,
	payer,
	[],
	undefined,
	TOKEN_2022_PROGRAM_ID
);

const mintAccountAfterSecondWithdraw = await getMint(
	connection,
	mint,
	undefined,
	TOKEN_2022_PROGRAM_ID
)

const mintTransferFeeConfigAfterSecondWithdraw = getTransferFeeConfig(mintAccountAfterSecondWithdraw);

const feeVaultAfterSecondWithdraw = await getAccount(
	connection,
	feeVaultAccount,
	undefined,
	TOKEN_2022_PROGRAM_ID
);

console.log(`Mint withheld balance after second withdraw: ${mintTransferFeeConfigAfterSecondWithdraw?.withheldAmount}`)
console.log(`Fee Vault balance after second withdraw: ${feeVaultAfterSecondWithdraw.amount}`)