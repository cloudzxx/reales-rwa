use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, FreezeAccount, ThawAccount, MintTo};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/// 白名单 PDA 数据：存储一个标记位
#[account]
pub struct WhitelistEntry {
    pub is_whitelisted: bool,
}

/// 程序全局权限 PDA：作为 SPL Token 的 freeze_authority
#[account]
pub struct AuthPda {
    pub bump: u8,
}

/// 初始化代币：创建 SPL Token Mint，将 freeze_authority 设为 AuthPDA
#[derive(Accounts)]
pub struct InitToken<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, mint::decimals = 9, mint::authority = admin, mint::freeze_authority = auth)]
    pub mint: Account<'info, Mint>,
    #[account(seeds = [b"auth"], bump)]
    pub auth: Account<'info, AuthPda>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// 添加白名单：创建 PDA 账户 [b"wl", address]
#[derive(Accounts)]
pub struct AddWhitelist<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// 要加入白名单的用户地址
    /// CHECK: 仅作为 PDA seed
    pub user: UncheckedAccount<'info>,
    #[account(init, payer = admin, space = 8 + 1, seeds = [b"wl", user.key().as_ref()], bump)]
    pub whitelist_entry: Account<'info, WhitelistEntry>,
    pub system_program: Program<'info, System>,
}

/// 移除白名单：关闭 PDA 账户并退回 rent
#[derive(Accounts)]
pub struct RemoveWhitelist<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: 仅作为 PDA seed
    pub user: UncheckedAccount<'info>,
    #[account(mut, close = admin, seeds = [b"wl", user.key().as_ref()], bump)]
    pub whitelist_entry: Account<'info, WhitelistEntry>,
}

/// 铸造代币：要求接收方在白名单内
#[derive(Accounts)]
pub struct MintTo<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    /// 校验白名单：接收方地址必须有对应的 WhitelistEntry
    #[account(seeds = [b"wl", destination.owner.as_ref()], bump, constraint = whitelist_entry.is_whitelisted @ ErrorCode::NotWhitelisted)]
    pub whitelist_entry: Account<'info, WhitelistEntry>,
    pub token_program: Program<'info, Token>,
}

/// 冻结地址
#[derive(Accounts)]
pub struct Freeze<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    /// 被冻结用户的 Token 账户
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    #[account(seeds = [b"auth"], bump)]
    pub auth: Account<'info, AuthPda>,
    pub token_program: Program<'info, Token>,
}

/// 解冻地址
#[derive(Accounts)]
pub struct Thaw<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,
    #[account(seeds = [b"auth"], bump)]
    pub auth: Account<'info, AuthPda>,
    pub token_program: Program<'info, Token>,
}

#[program]
pub mod reales_rwa_solana {
    use super::*;

    pub fn init_token(ctx: Context<InitToken>) -> Result<()> {
        msg!("Token mint created with freeze authority set to AuthPDA");
        Ok(())
    }

    pub fn add_whitelist(ctx: Context<AddWhitelist>) -> Result<()> {
        ctx.accounts.whitelist_entry.is_whitelisted = true;
        msg!("Whitelisted: {}", ctx.accounts.user.key());
        Ok(())
    }

    pub fn remove_whitelist(_ctx: Context<RemoveWhitelist>) -> Result<()> {
        // PDA 在指令执行后自动关闭（close = admin）
        msg!("Whitelist entry removed");
        Ok(())
    }

    pub fn mint_to(ctx: Context<MintTo>, amount: u64) -> Result<()> {
        let seeds = &[b"auth", &[ctx.bumps.auth]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.auth.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        msg!("Minted {} tokens to {}", amount, ctx.accounts.destination.owner);
        Ok(())
    }

    pub fn freeze_account(ctx: Context<Freeze>) -> Result<()> {
        let seeds = &[b"auth", &[ctx.bumps.auth]];
        token::freeze_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                FreezeAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.token_account.mint.to_account_info(),
                    authority: ctx.accounts.auth.to_account_info(),
                },
                &[seeds],
            ),
        )?;
        msg!("Frozen: {}", ctx.accounts.token_account.owner);
        Ok(())
    }

    pub fn thaw_account(ctx: Context<Thaw>) -> Result<()> {
        let seeds = &[b"auth", &[ctx.bumps.auth]];
        token::thaw_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.token_account.mint.to_account_info(),
                    authority: ctx.accounts.auth.to_account_info(),
                },
                &[seeds],
            ),
        )?;
        msg!("Thawed: {}", ctx.accounts.token_account.owner);
        Ok(())
    }
}

#[error_code]
pub enum ErrorCode {
    #[msg("Address is not whitelisted")]
    NotWhitelisted,
}
