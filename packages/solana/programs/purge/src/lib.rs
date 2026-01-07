use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re");

const SEED_CONFIG: &[u8] = b"config";
const SEED_VAULT: &[u8] = b"vault";

#[program]
pub mod purge {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>, 
        remote_eid: u32,
        remote_address: [u8; 32]
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.bump = ctx.bumps.config;
        
        config.remote_eid = remote_eid;
        config.remote_address = remote_address;
        
        msg!("Purge Spoke Initialized");
        Ok(())
    }

    pub fn set_peer(
        ctx: Context<SetPeer>,
        remote_eid: u32,
        remote_address: [u8; 32]
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.remote_eid = remote_eid;
        config.remote_address = remote_address;
        Ok(())
    }

    pub fn purge(ctx: Context<Purge>, amount: u64) -> Result<()> {
        // 1. Transfer USDC from User to Spoke Vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_usdc.to_account_info(),
            to: ctx.accounts.spoke_usdc_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;

        // 2. Increment Nonce
        let config = &mut ctx.accounts.config;
        config.nonce += 1;

        // 3. Emit Event for Relayer/LayerZero
        // The Relayer listens for this, verifying the USDC deposit, 
        // and sends the corresponding message to the Hub on Base.
        msg!("Purge Initiated: {} USDC. Nonce: {}", amount, config.nonce);
        
        emit!(PurgeEvent {
            user: ctx.accounts.user.key(),
            token_mint: ctx.accounts.usdc_mint.key(),
            amount,
            nonce: config.nonce,
            dst_eid: config.remote_eid,
            dst_address: config.remote_address,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::LEN,
        seeds = [SEED_CONFIG],
        bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = admin,
        seeds = [SEED_VAULT, usdc_mint.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = spoke_usdc_vault, // Vault owns itself? Or Config? Usually PDA signer.
    )]
    pub spoke_usdc_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct SetPeer<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    
    #[account(
        mut,
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = admin,
    )]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct Purge<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub user_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub usdc_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [SEED_CONFIG],
        bump = config.bump,
        has_one = usdc_mint,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [SEED_VAULT, usdc_mint.key().as_ref()],
        bump
    )]
    pub spoke_usdc_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub nonce: u64,
    pub remote_eid: u32,
    pub remote_address: [u8; 32],
    pub bump: u8,
}

impl Config {
    // Disc (8) + Pubkey (32) * 2 + u64 (8) + u32 (4) + [u8;32] (32) + u8 (1)
    pub const LEN: usize = 32 + 32 + 8 + 4 + 32 + 1; 
}

#[event]
pub struct PurgeEvent {
    pub user: Pubkey,
    pub token_mint: Pubkey,
    pub amount: u64,
    pub nonce: u64,
    pub dst_eid: u32,
    pub dst_address: [u8; 32],
}
