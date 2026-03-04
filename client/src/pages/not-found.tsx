import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-sm w-full text-center">
        <CardContent className="p-8 space-y-4">
          <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
          <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
          <Link href="/">
            <Button data-testid="button-go-home">Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
