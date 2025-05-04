import { StarIcon } from "lucide-react";
import { useState } from "react";
import { Form, useActionData, useOutletContext } from "react-router";
import InputPair from "~/common/components/input-pair";
import { Button } from "~/common/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/common/components/ui/dialog";
import { Label } from "~/common/components/ui/label";
import type { action } from "../pages/product-reviews-page";
import { cn } from "~/lib/utils";

export default function CreateReviewDialog() {
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const actionData = useActionData<typeof action>();
  const { isLoggedIn } = useOutletContext<{ isLoggedIn: boolean }>();
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-2xl">
          What do you think of this product?
        </DialogTitle>
        <DialogDescription>
          Share your thoughts and experiences with this product.
        </DialogDescription>
      </DialogHeader>
      <Form className="space-y-10" method="post">
        <div>
          <Label className="flex flex-col gap-1">
            Rating
            <small className="text-muted-foreground">
              What would you rate this product?
            </small>
          </Label>
          <div className="flex gap-2 mt-5">
            {[1, 2, 3, 4, 5].map((star) => (
              <label
                key={star}
                className="relative cursor-pointer"
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
              >
                <StarIcon
                  className="size-5 text-yellow-400"
                  fill={
                    hoveredStar >= star || rating >= star
                      ? "currentColor"
                      : "none"
                  }
                />
                <input
                  type="radio"
                  value={star}
                  name="rating"
                  required
                  className="opacity-0 h-px w-px absolute"
                  onChange={() => setRating(star)}
                />
              </label>
            ))}
          </div>
          {actionData?.formErrors?.rating && (
            <p className="text-red-500">
              {actionData.formErrors.rating.join(", ")}
            </p>
          )}
        </div>
        <InputPair
          textArea
          required
          name="review"
          label="Review"
          description="Maximum 1000 characters"
          placeholder="Tell us more about your experience with this product"
        />
        {actionData?.formErrors?.review && (
          <p className="text-red-500">
            {actionData.formErrors.review.join(", ")}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={!isLoggedIn}
            className={cn(!isLoggedIn && "cursor-not-allowed")}
          >
            {isLoggedIn ? "Submit review" : "Please log in to submit a review"}
          </Button>
        </DialogFooter>
      </Form>
    </DialogContent>
  );
}
