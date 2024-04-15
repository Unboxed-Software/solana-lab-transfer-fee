import { clusterApiUrl, Connection, Keypair } from '@solana/web3.js'
import { initializeKeypair } from '@solana-developers/helpers'
import { transferCheckedWithFee} from "@solana/spl-token"

/**
 * Create a connection and initialize a keypair if one doesn't already exists.
 * If a keypair exists, airdrop a SOL token if needed.
 */

// const connection = new Connection("http://127.0.0.1:8899")
const connection = new Connection(clusterApiUrl("devnet"))
const payer = await initializeKeypair(connection)

console.log(`public key: ${payer.publicKey.toBase58()}`)

const mintKeypair = Keypair.generate()
const mint = mintKeypair.publicKey
console.log(
	'\nmint public key: ' + mintKeypair.publicKey.toBase58() + '\n\n'
)

// CREATE MINT WITH TRANSFER FEE

// CREATE FEE VAULT ACCOUNT

// CREATE A SOURCE ACCOUNT AND MINT TOKEN

// CREATE DESTINATION ACCOUNT

// TRANSFER TOKENS

// FETCH ACCOUNTS WITH WITHHELD TOKENS

// WITHDRAW WITHHELD TOKENS

// VERIFY UPDATED FEE VAULT BALANCE

// HARVEST WITHHELD TOKENS TO MINT

// WITHDRAW HARVESTED TOKENS

// VERIFY UPDATED FEE VAULT BALANCE
