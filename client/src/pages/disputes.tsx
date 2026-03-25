import { AuthenticatedLayout } from "@/components/layouts";
import { StatusBadge } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Scale, Upload, FileText, Clock, CheckCircle, AlertTriangle,
  MessageSquare, ChevronDown, ChevronUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import type { Dispute, Transaction, DisputeMessage } from "@shared/schema";

const REASONS = [
  { value: "item_not_received", label: "Item Not Received", desc: "You haven't received the item" },
  { value: "item_not_as_described", label: "Not As Described", desc: "Item differs from listing description" },
  { value: "seller_unresponsive", label: "Seller Unresponsive", desc: "Seller isn't responding to messages" },
  { value: "other", label: "Other", desc: "Other issue with the transaction" },
];

type DisputeForm = {
  transactionId: string;
  reason: string;
  description: string;
};

export default function DisputesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedDispute, setExpandedDispute] = useState<number | null>(null);

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const { data: disputesData } = useQuery<Dispute[]>({
    queryKey: ["/api/disputes"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user,
  });

  const disputes = Array.isArray(disputesData) ? disputesData : [];
  const txList = Array.isArray(transactions) ? transactions : [];

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<DisputeForm>();

  const submitMutation = useMutation({
    mutationFn: async (data: DisputeForm) => {
      await apiRequest("POST", "/api/disputes", {
        transactionId: Number(data.transactionId),
        filedById: user?.id,
        againstId: 0, // server will figure it out
        reason: data.reason,
        description: data.description,
      });
    },
    onSuccess: () => {
      toast({ title: "Dispute submitted successfully" });
      reset();
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const onSubmit = handleSubmit((data) => submitMutation.mutate(data));

  const steps = [
    { icon: FileText, label: "Submit Dispute", desc: "Provide transaction details and evidence" },
    { icon: Clock, label: "Under Review", desc: "Our team reviews within 48 hours" },
    { icon: MessageSquare, label: "Communication", desc: "Both parties can share their side" },
    { icon: CheckCircle, label: "Resolution", desc: "A fair decision is made" },
  ];

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Scale className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Dispute Center</h1>
            <p className="text-muted-foreground">Submit and track disputes for your transactions</p>
          </div>
        </div>

        <Tabs defaultValue="submit">
          <TabsList className="rounded-xl">
            <TabsTrigger value="submit" className="rounded-lg" data-testid="submit-dispute-tab">
              Submit Dispute
            </TabsTrigger>
            <TabsTrigger value="track" className="rounded-lg" data-testid="track-disputes-tab">
              Track Disputes ({disputes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle>File a New Dispute</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label>Transaction</Label>
                      <Controller
                        name="transactionId"
                        control={control}
                        rules={{ required: "Select a transaction" }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="rounded-xl" data-testid="dispute-transaction">
                              <SelectValue placeholder="Select a transaction" />
                            </SelectTrigger>
                            <SelectContent>
                              {txList.map((tx) => (
                                <SelectItem key={tx.id} value={String(tx.id)}>
                                  Transaction #{tx.id} - {tx.amount} SB
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.transactionId && <p className="text-xs text-destructive">{errors.transactionId.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Controller
                        name="reason"
                        control={control}
                        rules={{ required: "Select a reason" }}
                        render={({ field }) => (
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-3">
                            {REASONS.map((r) => (
                              <label
                                key={r.value}
                                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                                  field.value === r.value ? "border-primary bg-primary/5" : "border-border"
                                }`}
                                data-testid={`reason-${r.value}`}
                              >
                                <RadioGroupItem value={r.value} className="mt-0.5" />
                                <div>
                                  <span className="font-medium text-sm">{r.label}</span>
                                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                                </div>
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dispute-desc">Description</Label>
                      <Textarea
                        id="dispute-desc"
                        placeholder="Describe the issue in detail..."
                        rows={5}
                        className="rounded-xl"
                        data-testid="dispute-description"
                        {...register("description", { required: "Description is required" })}
                      />
                      {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Evidence (optional)</Label>
                      <div className="border-2 border-dashed rounded-xl p-6 text-center">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Upload screenshots or documents</p>
                        <Input type="file" className="mt-2 mx-auto max-w-xs" data-testid="dispute-evidence" />
                      </div>
                    </div>

                    <Button
                      onClick={onSubmit}
                      disabled={submitMutation.isPending}
                      className="rounded-xl gap-2"
                      data-testid="submit-dispute-btn"
                    >
                      <Scale className="h-4 w-4" />
                      Submit Dispute
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Process steps */}
              <Card className="rounded-xl h-fit">
                <CardHeader>
                  <CardTitle className="text-base">Dispute Process</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {steps.map((step, i) => {
                      const Icon = step.icon;
                      return (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            {i < steps.length - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                          </div>
                          <div className="pb-4">
                            <p className="font-medium text-sm">{step.label}</p>
                            <p className="text-xs text-muted-foreground">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="track" className="mt-6">
            {disputes.length === 0 ? (
              <Card className="rounded-xl">
                <CardContent className="py-12 text-center">
                  <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No disputes filed yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {disputes.map((dispute: any) => (
                  <Card key={dispute.id} className="rounded-xl">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="font-medium">
                              Dispute #{dispute.id} - Transaction #{dispute.transactionId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Filed {formatDistanceToNow(new Date(dispute.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={dispute.status} />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExpandedDispute(expandedDispute === dispute.id ? null : dispute.id)}
                            data-testid={`expand-dispute-${dispute.id}`}
                          >
                            {expandedDispute === dispute.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      {expandedDispute === dispute.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Reason</p>
                            <p className="text-sm font-medium">{dispute.reason.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Description</p>
                            <p className="text-sm">{dispute.description}</p>
                          </div>
                          {dispute.messages && dispute.messages.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">Timeline</p>
                              <div className="space-y-2">
                                {dispute.messages.map((msg: DisputeMessage) => (
                                  <div key={msg.id} className="flex gap-2 text-sm">
                                    <Badge variant={msg.isAdmin ? "default" : "secondary"} className="text-[10px] h-5 shrink-0">
                                      {msg.isAdmin ? "Admin" : "You"}
                                    </Badge>
                                    <p>{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AuthenticatedLayout>
  );
}
