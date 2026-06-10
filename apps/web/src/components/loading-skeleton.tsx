import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingSkeletonProps = {
  variant?: "page" | "cards" | "table";
};

export function LoadingSkeleton({ variant = "page" }: LoadingSkeletonProps) {
  let result = null;

  if (variant === "cards") {
    result = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => {
          let card = (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          );
          return card;
        })}
      </div>
    );
    return result;
  }

  if (variant === "table") {
    result = (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, index) => {
          let row = <Skeleton key={index} className="h-12 w-full" />;
          return row;
        })}
      </div>
    );
    return result;
  }

  result = (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
  return result;
}
