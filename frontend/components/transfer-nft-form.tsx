import { zodResolver } from "@hookform/resolvers/zod"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { Transaction } from "@solana/web3.js"
import { Loader2Icon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Networks } from "@/config/enum"
import { transferNFT } from "@/libs/shyft"
import { Nft } from "@/types"
import ConnectWalletButton from "./connect-wallet-button"
import { NetworkSelect } from "./network-select"
import { useToast } from "./ui/toast"
import { Typography } from "./ui/typography"

export function TransferNFTForm() {
  const { toast } = useToast()
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [nfts, setNFTs] = useState<Nft[]>([])
  const [loading, setLoading] = useState(false)

  const formSchema = useMemo(() => {
    return z.object({
      merkle_tree: z.string().trim().min(1, { message: "This field is required." }),
      nft_address: z.string().trim().min(1, { message: "This field is required." }),
      receiver: z
        .string()
        .trim()
        .min(1, { message: "This field is required." })
        .refine((value) => value && publicKey && value !== publicKey.toBase58(), {
          message: "Unable to transfer your NFT to yourself.",
        }),
      network: z.enum(Networks),
    })
  }, [publicKey])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      merkle_tree: "",
      nft_address: "",
      receiver: "",
      network: "devnet",
    },
  })

  const network = form.watch("network")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!publicKey) {
        toast({
          variant: "warning",
          title: "Please connect to your wallet",
        })
        return
      }
      const response = await transferNFT({
        sender: publicKey.toBase58(),
        merkle_tree: values.merkle_tree,
        nft_address: values.nft_address,
        receiver: values.receiver,
        network: values.network,
      })

      if (response.success) {
        const tx = Transaction.from(Buffer.from(response.result.encoded_transaction, "base64"))
        const signature = await sendTransaction(tx, connection)
        await connection.confirmTransaction(signature, "confirmed")

        toast({
          variant: "success",
          title: "NFT transfered successfully",
          description: (
            <a
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://translator.shyft.to/tx/${signature}?cluster=${values.network}`}
            >
              View transaction
            </a>
          ),
        })
      } else {
        toast({
          variant: "error",
          title: "Error :(",
          description: response.message ?? "Unknown error",
        })
      }
    } catch (error: any) {
      toast({
        variant: "error",
        title: "Error :(",
        description: error?.message ?? "Unknown error",
      })
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="rounded-2xl shadow-card bg-white flex flex-col gap-5 p-5 mb-5">
            {/* merkle tree */}
            <FormField
              control={form.control}
              name="merkle_tree"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Merkle tree</FormLabel>
                  <FormControl>
                    <Input placeholder="Merkle tree address" error={fieldState.invalid} {...field} />
                  </FormControl>
                  <FormDescription>Merkle tree where NFT present</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* nft */}
            <FormField
              control={form.control}
              name="nft_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NFT</FormLabel>
                  {connected ? (
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select NFT" />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent
                          position="popper"
                          sideOffset={8}
                          className="!w-[var(--radix-select-trigger-width)]"
                        >
                          {loading ? (
                            <div className="flex items-center justify-center p-10">
                              <Loader2Icon className="animate-spin" />
                            </div>
                          ) : (
                            nfts.map((nft) => (
                              <SelectItem key={nft.mint} value={nft.mint}>
                                <div className="!flex items-center gap-3">
                                  <img
                                    className="w-8 h-8 object-contain rounded-sm overflow-hidden"
                                    src={nft.cached_image_uri ?? nft.image_uri}
                                    alt={nft.name}
                                  />
                                  {nft.name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl>
                      <Typography as="p" color="warning">
                        You need to connect to you wallet
                      </Typography>
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* receiver */}
            <FormField
              control={form.control}
              name="receiver"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Receiver</FormLabel>
                  <FormControl>
                    <Input placeholder="Receiver wallet address" error={fieldState.invalid} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* network */}
            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Network</FormLabel>
                  <FormControl>
                    <NetworkSelect onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                      </FormControl>
                    </NetworkSelect>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex justify-end">
            {connected ? (
              <Button loading={form.formState.isSubmitting} type="submit">
                Transfer
              </Button>
            ) : (
              <ConnectWalletButton>Connect Wallet</ConnectWalletButton>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
