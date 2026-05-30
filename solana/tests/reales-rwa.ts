import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getAccount,
} from "@solana/spl-token";
import { expect } from "chai";
import type { RealesRwaSolana } from "../target/types/reales_rwa_solana";

describe("reales-rwa-solana", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.RealesRwaSolana as Program<RealesRwaSolana>;
  const admin = provider.wallet.publicKey;

  // PDA seeds
  const authPda = PublicKey.findProgramAddressSync(
    [Buffer.from("auth")],
    program.programId
  )[0];

  let mint: PublicKey;
  let user = anchor.web3.Keypair.generate();
  let userTokenAccount: PublicKey;

  it("初始化代币", async () => {
    const mintKp = anchor.web3.Keypair.generate();
    mint = mintKp.publicKey;

    await program.methods
      .initToken()
      .accounts({
        admin,
        mint: mint,
        auth: authPda,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKp])
      .rpc();

    const mintAccount = await program.provider.connection.getAccountInfo(mint);
    expect(mintAccount).not.null;
  });

  it("添加白名单", async () => {
    const [wlPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("wl"), user.publicKey.toBytes()],
      program.programId
    );

    await program.methods
      .addWhitelist()
      .accounts({
        admin,
        user: user.publicKey,
        whitelistEntry: wlPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const entry = await program.account.whitelistEntry.fetch(wlPda);
    expect(entry.isWhitelisted).true;
  });

  it("铸造代币到白名单地址", async () => {
    userTokenAccount = getAssociatedTokenAddressSync(mint, user.publicKey);

    await program.methods
      .mintTo(new anchor.BN(1000))
      .accounts({
        admin,
        mint,
        destination: userTokenAccount,
        whitelistEntry: PublicKey.findProgramAddressSync(
          [Buffer.from("wl"), user.publicKey.toBytes()],
          program.programId
        )[0],
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const account = await getAccount(provider.connection, userTokenAccount);
    expect(account.amount).equal(1000n);
  });

  it("冻结和解冻", async () => {
    // Freeze
    await program.methods
      .freezeAccount()
      .accounts({
        admin,
        tokenAccount: userTokenAccount,
        auth: authPda,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const frozen = await getAccount(provider.connection, userTokenAccount);
    expect(frozen.isFrozen).true;

    // Thaw
    await program.methods
      .thawAccount()
      .accounts({
        admin,
        tokenAccount: userTokenAccount,
        auth: authPda,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc();

    const thawed = await getAccount(provider.connection, userTokenAccount);
    expect(thawed.isFrozen).false;
  });
});
