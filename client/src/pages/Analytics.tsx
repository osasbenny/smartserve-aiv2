import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { BarChart3, MessageSquare, Calendar, Star, TrendingUp } from "lucide-react";

export default function Analytics() {
  const { agentId } = useParams<{ agentId: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Fetch agent details
  const { data: agentData, isLoading: agentLoading } = trpc.agent.getById.useQuery({
    id: parseInt(agentId || "0"),
  });

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading } = trpc.analyticsData.getByAgentAndDate.useQuery({
    agentId: parseInt(agentId || "0"),
    date: new Date(selectedDate),
  });

  useEffect(() => {
    if (agentData) {
      setAgent(agentData);
    }
  }, [agentData]);

  useEffect(() => {
    if (analyticsData) {
      setAnalytics(analyticsData);
    }
  }, [analyticsData]);

  if (agentLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Loading analytics...</div>
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

  const stats = [
    {
      title: "Total Chats",
      value: analytics?.totalChats || 0,
      icon: MessageSquare,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Total Messages",
      value: analytics?.totalMessages || 0,
      icon: TrendingUp,
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Appointments",
      value: analytics?.totalAppointments || 0,
      icon: Calendar,
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Avg. Satisfaction",
      value: analytics?.averageSatisfactionScore
        ? (parseFloat(analytics.averageSatisfactionScore) / 5 * 100).toFixed(0) + "%"
        : "N/A",
      icon: Star,
      color: "bg-yellow-100 text-yellow-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600 mt-2">{agent.name}</p>
        </div>

        {/* Date Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date
                </label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <Button>Apply</Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Appointment Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Metrics</CardTitle>
              <CardDescription>Appointment statistics for the selected date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-slate-600">Total Appointments</span>
                <span className="font-semibold text-lg">
                  {analytics?.totalAppointments || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-slate-600">Completed</span>
                <span className="font-semibold text-lg text-green-600">
                  {analytics?.completedAppointments || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600">Cancelled</span>
                <span className="font-semibold text-lg text-red-600">
                  {analytics?.cancelledAppointments || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Client Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Client Metrics</CardTitle>
              <CardDescription>Client activity for the selected date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-slate-600">Total Clients</span>
                <span className="font-semibold text-lg">
                  {analytics?.totalClients || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-slate-600">New Clients</span>
                <span className="font-semibold text-lg text-blue-600">
                  {analytics?.newClients || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600">Avg. Satisfaction</span>
                <span className="font-semibold text-lg text-yellow-600">
                  {analytics?.averageSatisfactionScore
                    ? (parseFloat(analytics.averageSatisfactionScore) / 5 * 100).toFixed(1)
                    : "N/A"}
                  %
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Chat Metrics</CardTitle>
            <CardDescription>Chat activity for the selected date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-slate-600">Total Chats</span>
                <span className="font-semibold text-lg">
                  {analytics?.totalChats || 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-slate-600">Total Messages</span>
                <span className="font-semibold text-lg">
                  {analytics?.totalMessages || 0}
                </span>
              </div>
              {analytics?.totalChats > 0 && (
                <div className="flex justify-between items-center py-3 border-t">
                  <span className="text-slate-600">Avg. Messages per Chat</span>
                  <span className="font-semibold text-lg">
                    {(analytics.totalMessages / analytics.totalChats).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Export Data</CardTitle>
            <CardDescription>Download analytics reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="outline">Export as CSV</Button>
              <Button variant="outline">Export as PDF</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
