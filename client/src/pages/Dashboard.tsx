import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, MessageSquare, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState<number | null>(null);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [newAgentData, setNewAgentData] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    welcomeMessage: "",
  });

  // Fetch businesses
  const { data: businesses, isLoading: businessesLoading } = trpc.business.getMyBusinesses.useQuery();

  // Fetch agents for selected business
  const { data: agents, isLoading: agentsLoading, refetch: refetchAgents } = trpc.agent.getByBusinessId.useQuery(
    { businessId: selectedBusiness! },
    { enabled: !!selectedBusiness }
  );

  // Create agent mutation
  const createAgentMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      alert("Agent created successfully!");
      setIsCreateAgentOpen(false);
      setNewAgentData({
        name: "",
        description: "",
        systemPrompt: "",
        welcomeMessage: "",
      });
      refetchAgents();
    },
    onError: (error) => {
      alert(error.message || "Failed to create agent");
    },
  });

  // Delete agent mutation
  const deleteAgentMutation = trpc.agent.delete.useMutation({
    onSuccess: () => {
      alert("Agent deleted successfully!");
      refetchAgents();
    },
    onError: (error) => {
      alert(error.message || "Failed to delete agent");
    },
  });

  const handleCreateAgent = async () => {
    if (!selectedBusiness || !newAgentData.name) {
      alert("Please fill in all required fields");
      return;
    }

    await createAgentMutation.mutateAsync({
      businessId: selectedBusiness,
      name: newAgentData.name,
      description: newAgentData.description,
      systemPrompt: newAgentData.systemPrompt,
      welcomeMessage: newAgentData.welcomeMessage,
    });
  };

  const currentBusiness = businesses?.find((b) => b.id === selectedBusiness);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">Manage your AI agents and customer interactions</p>
        </div>

        {/* Business Selection */}
        {!selectedBusiness ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">Select a Business</h2>
            {businessesLoading ? (
              <p className="text-slate-600">Loading businesses...</p>
            ) : businesses && businesses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businesses.map((business) => (
                  <Card
                    key={business.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedBusiness(business.id)}
                  >
                    <CardHeader>
                      <CardTitle>{business.name}</CardTitle>
                      <CardDescription>{business.industry || "No industry specified"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600">{business.description || "No description"}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-600 uppercase">
                          {business.subscriptionPlan}
                        </span>
                        <span className="text-xs text-slate-500">
                          {business.subscriptionStatus}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-slate-600 text-center">No businesses found. Create one to get started!</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <>
            {/* Business Header */}
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-semibold mb-2"
                >
                  ← Back to Businesses
                </button>
                <h2 className="text-3xl font-bold text-slate-900">{currentBusiness?.name}</h2>
                <p className="text-slate-600">{currentBusiness?.description}</p>
              </div>
              <Dialog open={isCreateAgentOpen} onOpenChange={setIsCreateAgentOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create New Agent
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New AI Agent</DialogTitle>
                    <DialogDescription>
                      Set up a new AI chatbot for your business
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="agent-name">Agent Name *</Label>
                      <Input
                        id="agent-name"
                        placeholder="e.g., Customer Support Bot"
                        value={newAgentData.name}
                        onChange={(e) =>
                          setNewAgentData({ ...newAgentData, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="agent-description">Description</Label>
                      <Textarea
                        id="agent-description"
                        placeholder="Describe what this agent does..."
                        value={newAgentData.description}
                        onChange={(e) =>
                          setNewAgentData({ ...newAgentData, description: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="system-prompt">System Prompt</Label>
                      <Textarea
                        id="system-prompt"
                        placeholder="Define the agent's behavior and personality..."
                        value={newAgentData.systemPrompt}
                        onChange={(e) =>
                          setNewAgentData({ ...newAgentData, systemPrompt: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="welcome-message">Welcome Message</Label>
                      <Input
                        id="welcome-message"
                        placeholder="e.g., Hello! How can I help you today?"
                        value={newAgentData.welcomeMessage}
                        onChange={(e) =>
                          setNewAgentData({ ...newAgentData, welcomeMessage: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      onClick={handleCreateAgent}
                      disabled={createAgentMutation.isPending}
                      className="w-full"
                    >
                      {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Agents List */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-900">AI Agents</h3>
              {agentsLoading ? (
                <p className="text-slate-600">Loading agents...</p>
              ) : agents && agents.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {agents.map((agent) => (
                    <Card key={agent.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>{agent.name}</CardTitle>
                            <CardDescription>{agent.description}</CardDescription>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              agent.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {agent.status}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600 mb-4">
                          {agent.welcomeMessage || "No welcome message set"}
                        </p>
                        <div className="flex gap-2">
                          <Link href={`/agent/${agent.id}`}>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Settings className="w-4 h-4" />
                              Configure
                            </Button>
                          </Link>
                          <Link href={`/agent/${agent.id}/chat`}>
                            <Button size="sm" variant="outline" className="gap-2">
                              <MessageSquare className="w-4 h-4" />
                              Test Chat
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => deleteAgentMutation.mutate({ id: agent.id })}
                            disabled={deleteAgentMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-slate-600 text-center mb-4">
                      No agents yet. Create your first AI agent to get started!
                    </p>
                    <Button
                      onClick={() => setIsCreateAgentOpen(true)}
                      className="w-full gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Agent
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{agents?.length || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {agents?.filter((a) => a.status === "active").length || 0}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Subscription</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold capitalize">
                    {currentBusiness?.subscriptionPlan}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
