import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen p-24">
      <h1 className="text-4xl font-bold mb-8">DocAnalyzer</h1>
      <p className="text-muted-foreground mb-12">
        Anonymous document analysis with AI-powered insights
      </p>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Drag and drop or click to upload your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>Select File</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              No signup required. Get instant insights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">Learn More</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

