import { Container, Heading, Text, Button, Table, Badge } from "@medusajs/ui"
import { PencilSquare, Plus } from "@medusajs/icons"

const BlogPage = () => {
  const posts = [
    { id: 1, title: "Ghid: Cum să alegi produsele potrivite", category: "Ghiduri", status: "published", date: "2024-01-20" },
    { id: 2, title: "Top 10 tendințe pentru 2024", category: "Tendințe", status: "published", date: "2024-01-18" },
    { id: 3, title: "Beneficiile cumpărăturilor online", category: "Tips", status: "draft", date: "2024-01-15" },
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Blog</Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            Gestionează articolele și categoriile blog-ului
          </Text>
        </div>
        <Button variant="primary">
          <Plus className="mr-2" />
          Articol Nou
        </Button>
      </div>

      <div className="px-6 py-4">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Titlu</Table.HeaderCell>
              <Table.HeaderCell>Categorie</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Data</Table.HeaderCell>
              <Table.HeaderCell>Acțiuni</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {posts.map((post) => (
              <Table.Row key={post.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <PencilSquare className="w-4 h-4 text-ui-fg-muted" />
                    <Text className="font-medium">{post.title}</Text>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge color="grey">{post.category}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={post.status === "published" ? "green" : "orange"}>
                    {post.status === "published" ? "Publicat" : "Draft"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text className="text-ui-fg-subtle text-sm">{post.date}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Button variant="secondary" size="small">Editează</Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>

        <div className="mt-6 p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
          <Heading level="h3" className="text-sm mb-2">Categorii Blog</Heading>
          <div className="flex gap-2 flex-wrap">
            <Badge color="blue">Ghiduri (5)</Badge>
            <Badge color="purple">Tendințe (3)</Badge>
            <Badge color="green">Tips (8)</Badge>
            <Badge color="orange">Noutăți (2)</Badge>
          </div>
        </div>
      </div>
    </Container>
  )
}

export default BlogPage
