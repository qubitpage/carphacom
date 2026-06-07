import { Container, Heading, Text, Button, Table, Badge } from "@medusajs/ui"
import { DocumentText, Plus } from "@medusajs/icons"

const CMSPagesPage = () => {
  const pages = [
    { id: 1, title: "Despre Noi", slug: "/about", status: "published", updated: "2024-01-15" },
    { id: 2, title: "Contact", slug: "/contact", status: "published", updated: "2024-01-10" },
    { id: 3, title: "Termeni și Condiții", slug: "/terms", status: "draft", updated: "2024-01-08" },
    { id: 4, title: "Politica de Confidențialitate", slug: "/privacy", status: "published", updated: "2024-01-05" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Pagini CMS</Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Gestionează paginile statice ale magazinului
          </Text>
        </div>
        <Button variant="primary">
          <Plus className="mr-2" />
          Pagină Nouă
        </Button>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Titlu</Table.HeaderCell>
              <Table.HeaderCell>URL</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Actualizat</Table.HeaderCell>
              <Table.HeaderCell>Acțiuni</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pages.map((page) => (
              <Table.Row key={page.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <DocumentText className="w-4 h-4 text-ui-fg-muted" />
                    <Text className="font-medium">{page.title}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle font-mono text-sm">{page.slug}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={page.status === "published" ? "green" : "orange"}>
                    {page.status === "published" ? "Publicat" : "Draft"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm">{page.updated}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Button variant="secondary" size="small">Editează</Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

export default CMSPagesPage
