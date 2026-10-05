import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function FormNotFound() {
  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The form you&apos;re looking for doesn&apos;t exist or is not currently available.
            </p>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
