import { Container, Heading, Text, Button, Table, Badge } from "@medusajs/ui"
import { Envelope, Plus, ArrowUpRightOnBox } from "@medusajs/icons"

const EmailPage = () => {
  const campaigns = [
    { id: 1, name: "Newsletter Ianuarie", status: "sent", recipients: 2450, opened: 1203, date: "2024-01-15" },
    { id: 2, name: "Reduceri de Iarnă", status: "sent", recipients: 3200, opened: 1856, date: "2024-01-10" },
    { id: 3, name: "Produse Noi", status: "draft", recipients: 0, opened: 0, date: "2024-01-20" },
    { id: 4, name: "Abandon Coș", status: "active", recipients: 156, opened: 89, date: "Auto" },
  ]

  const templates = [
    { id: 1, name: "Welcome Email", type: "Automatizare" },
    { id: 2, name: "Order Confirmation", type: "Tranzacțional" },
    { id: 3, name: "Newsletter Template", type: "Marketing" },
    { id: 4, name: "Abandoned Cart", type: "Automatizare" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Email Marketing</Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Campanii email și automatizări
          </Text>
        </div>
        <Button variant="primary">
          <Plus className="mr-2" />
          Campanie Nouă
        </Button>
      </div>

      <div className="px-6 py-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <Text className="text-sm text-ui-fg-subtle">Total Abonați</Text>
            <Text className="text-2xl font-bold">3,542</Text>
          </div>
          <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <Text className="text-sm text-ui-fg-subtle">Campanii Active</Text>
            <Text className="text-2xl font-bold">2</Text>
          </div>
          <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <Text className="text-sm text-ui-fg-subtle">Rată Deschidere</Text>
            <Text className="text-2xl font-bold">48.5%</Text>
          </div>
          <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
            <Text className="text-sm text-ui-fg-subtle">Emails Trimise Luna</Text>
            <Text className="text-2xl font-bold">5,806</Text>
          </div>
        </div>

        <Heading level="h2" className="text-lg mb-4">Campanii Recente</Heading>
        <Table className="mb-8">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Campanie</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Destinatari</Table.HeaderCell>
              <Table.HeaderCell>Deschise</Table.HeaderCell>
              <Table.HeaderCell>Data</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {campaigns.map((campaign) => (
              <Table.Row key={campaign.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <Envelope className="w-4 h-4 text-ui-fg-muted" />
                    <Text className="font-medium">{campaign.name}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={
                    campaign.status === "sent" ? "green" : 
                    campaign.status === "active" ? "blue" : "orange"
                  }>
                    {campaign.status === "sent" ? "Trimis" : 
                     campaign.status === "active" ? "Activ" : "Draft"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{campaign.recipients.toLocaleString()}</Table.Cell>
                <Table.Cell>
                  {campaign.opened > 0 ? `${campaign.opened.toLocaleString()} (${Math.round(campaign.opened/campaign.recipients*100)}%)` : "-"}
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm">{campaign.date}</Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        <Heading level="h2" className="text-lg mb-4">Template-uri Email</Heading>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {templates.map((template) => (
            <div 
              key={template.id}
              className="p-4 border border-ui-border-base rounded-lg hover:border-ui-border-interactive cursor-pointer transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center mb-3">
                <Envelope className="w-5 h-5 text-ui-fg-muted" />
              </div>
              <Text className="font-medium text-sm">{template.name}</Text>
              <Text className="text-xs text-ui-fg-subtle">{template.type}</Text>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
}

export default EmailPage
