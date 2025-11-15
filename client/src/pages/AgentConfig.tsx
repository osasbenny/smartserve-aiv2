import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { Plus, Trash2, Save } from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
}

export default function AgentConfig() {
  const { agentId } = useParams<{ agentId: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newFaq, setNewFaq] = useState<FAQ>({ question: "", answer: "" });
  const [businessHours, setBusinessHours] = useState({
    start: "09:00",
    end: "17:00",
    timezone: "UTC",
    enabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch agent details
  const { data: agentData, isLoading } = trpc.agent.getById.useQuery({
    id: parseInt(agentId || "0"),
  });

  useEffect(() => {
    if (agentData) {
      setAgent(agentData);
      if (agentData.faqData && Array.isArray(agentData.faqData)) {
        setFaqs(agentData.faqData as FAQ[]);
      }
      setBusinessHours({
        start: agentData.businessHoursStart || "09:00",
        end: agentData.businessHoursEnd || "17:00",
        timezone: agentData.businessHoursTimezone || "UTC",
        enabled: agentData.businessHoursEnabled ?? true,
      });
    }
  }, [agentData]);

  const updateAgentMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      alert("Agent updated successfully!");
      setIsSaving(false);
    },
    onError: (error) => {
      alert(error.message || "Failed to update agent");
      setIsSaving(false);
    },
  });

  const uploadFaqMutation = trpc.agent.uploadFAQ.useMutation({
    onSuccess: () => {
      alert("FAQs uploaded successfully!");
      setNewFaq({ question: "", answer: "" });
    },
    onError: (error) => {
      alert(error.message || "Failed to upload FAQs");
    },
  });

  const handleAddFaq = () => {
    if (!newFaq.question || !newFaq.answer) {
      alert("Please fill in both question and answer");
      return;
    }
    setFaqs([...faqs, newFaq]);
    setNewFaq({ question: "", answer: "" });
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs((prevFaqs) => prevFaqs.filter((_, i) => i !== index));
  };

  const handleSaveSettings = async () => {
    if (!agent) return;
    setIsSaving(true);

    await updateAgentMutation.mutateAsync({
      id: agent.id,
      businessHoursStart: businessHours.start,
      businessHoursEnd: businessHours.end,
      businessHoursTimezone: businessHours.timezone,
      businessHoursEnabled: businessHours.enabled,
    });
  };

  const handleSaveFaqs = async () => {
    if (!agent) return;
    await uploadFaqMutation.mutateAsync({
      agentId: agent.id,
      faqs: faqs,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Loading agent configuration...</div>
      </DashboardLayout>
    );
  }

  if (!agent) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Agent not found</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Configure Agent</h1>
          <p className="text-slate-600 mt-2">{agent.name}</p>
        </div>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>Set when your agent is available to respond</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="hours-enabled"
                checked={businessHours.enabled}
                onChange={(e) =>
                  setBusinessHours({ ...businessHours, enabled: e.target.checked })
                }
                className="w-4 h-4"
              />
              <Label htmlFor="hours-enabled">Enable business hours</Label>
            </div>

            {businessHours.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={businessHours.start}
                    onChange={(e) =>
                      setBusinessHours({ ...businessHours, start: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={businessHours.end}
                    onChange={(e) =>
                      setBusinessHours({ ...businessHours, end: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={businessHours.timezone}
                    onChange={(e) =>
                      setBusinessHours({ ...businessHours, timezone: e.target.value })
                    }
                    placeholder="e.g., UTC, EST, PST"
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSaveSettings} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Business Hours"}
            </Button>
          </CardContent>
        </Card>

        {/* FAQ Management */}
        <Card>
          <CardHeader>
            <CardTitle>FAQ Management</CardTitle>
            <CardDescription>
              Add frequently asked questions that your agent will use to respond to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New FAQ */}
            <div className="border-b pb-6 space-y-4">
              <h3 className="font-semibold text-slate-900">Add New FAQ</h3>
              <div>
                <Label htmlFor="faq-question">Question</Label>
                <Input
                  id="faq-question"
                  placeholder="e.g., What are your business hours?"
                  value={newFaq.question}
                  onChange={(e) =>
                    setNewFaq({ ...newFaq, question: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="faq-answer">Answer</Label>
                <Textarea
                  id="faq-answer"
                  placeholder="Provide a detailed answer..."
                  value={newFaq.answer}
                  onChange={(e) =>
                    setNewFaq({ ...newFaq, answer: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <Button
                onClick={handleAddFaq}
                variant="outline"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add FAQ
              </Button>
            </div>

            {/* FAQ List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">
                Current FAQs ({faqs.length})
              </h3>
              {faqs.length > 0 ? (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">
                            Q: {faq.question}
                          </p>
                          <p className="text-slate-600 mt-2">A: {faq.answer}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleRemoveFaq(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 text-center py-8">
                  No FAQs added yet. Add one to get started!
                </p>
              )}
            </div>

            {faqs.length > 0 && (
              <Button
                onClick={handleSaveFaqs}
                disabled={uploadFaqMutation.isPending}
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                {uploadFaqMutation.isPending ? "Saving..." : "Save All FAQs"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Settings</CardTitle>
            <CardDescription>
              Connect WhatsApp and email for automated reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="whatsapp-phone">WhatsApp Phone ID</Label>
              <Input
                id="whatsapp-phone"
                placeholder="Your WhatsApp Business Phone ID"
                defaultValue={agent.whatsappPhoneId || ""}
              />
              <p className="text-sm text-slate-500 mt-2">
                Get this from your WhatsApp Business API dashboard
              </p>
            </div>

            <div>
              <Label htmlFor="email-sender">Email Sender Address</Label>
              <Input
                id="email-sender"
                type="email"
                placeholder="noreply@yourbusiness.com"
                defaultValue={agent.emailSenderAddress || ""}
              />
            </div>

            <div>
              <Label htmlFor="email-name">Email Sender Name</Label>
              <Input
                id="email-name"
                placeholder="Your Business Name"
                defaultValue={agent.emailSenderName || ""}
              />
            </div>

            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Save Integration Settings
            </Button>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
            <CardDescription>
              Define how your agent behaves and responds to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="You are a helpful customer service representative..."
              defaultValue={agent.systemPrompt || ""}
              rows={6}
            />
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Save System Prompt
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
