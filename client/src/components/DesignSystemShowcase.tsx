import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Info, AlertCircle, Check, Bell } from 'lucide-react';

const DesignSystemShowcase = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif mb-4">Satya Coaching Design System</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A unified visual language for the Satya Coaching application, based on the Lumea color
          palette and consistent component designs.
        </p>
      </div>

      {/* Typography */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Typography</h2>
        <div className="grid gap-4">
          <h1>Heading 1 - Playfair Display</h1>
          <h2>Heading 2 - Playfair Display</h2>
          <h3>Heading 3 - Playfair Display</h3>
          <h4>Heading 4 - Playfair Display</h4>
          <h5>Heading 5 - Playfair Display</h5>
          <h6>Heading 6 - Playfair Display</h6>
          <p className="text-base">
            Body Text - Inter - Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in
            dui mauris.
          </p>
          <p className="text-sm">
            Small Text - Inter - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
          </p>
        </div>
      </section>

      {/* Color Palette */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Lumea Color Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <div className="h-24 rounded-md bg-[#60574D]"></div>
            <p className="font-medium">Stone</p>
            <p className="text-xs text-muted-foreground">#60574D</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-md bg-[#F1EDE4]"></div>
            <p className="font-medium">Beige</p>
            <p className="text-xs text-muted-foreground">#F1EDE4</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-md bg-[#8FAAA5]"></div>
            <p className="font-medium">Sage</p>
            <p className="text-xs text-muted-foreground">#8FAAA5</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-md bg-[#C8B6A6]"></div>
            <p className="font-medium">Taupe</p>
            <p className="text-xs text-muted-foreground">#C8B6A6</p>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-md bg-[#DAD3C8]"></div>
            <p className="font-medium">Bone</p>
            <p className="text-xs text-muted-foreground">#DAD3C8</p>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Buttons</h2>
        <div className="grid gap-6">
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="lumea">Lumea</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="default" size="sm">
              Small
            </Button>
            <Button variant="default" size="default">
              Default
            </Button>
            <Button variant="default" size="lg">
              Large
            </Button>
            <Button variant="default" size="xl">
              Extra Large
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="default" rounded="default">
              Rounded Default
            </Button>
            <Button variant="default" rounded="full">
              Rounded Full
            </Button>
            <Button variant="default" rounded="none">
              Rounded None
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="default" disabled>
              Disabled
            </Button>
            <Button variant="default">
              <Info className="mr-1" /> With Icon
            </Button>
          </div>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>Basic card layout with standard styling</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is the standard card component with default styling.</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated Card</CardTitle>
              <CardDescription>Card with elevated appearance</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card has enhanced shadow for a more prominent appearance.</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>

          <Card variant="outline">
            <CardHeader>
              <CardTitle>Outline Card</CardTitle>
              <CardDescription>Card with border emphasis</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card emphasizes the border rather than shadow.</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>

          <Card variant="lumea">
            <CardHeader>
              <CardTitle>Lumea Card</CardTitle>
              <CardDescription>Brand-specific styling</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card uses the Lumea styling with translucent background.</p>
            </CardContent>
            <CardFooter>
              <Button variant="lumea">Action</Button>
            </CardFooter>
          </Card>

          <Card variant="glass">
            <CardHeader>
              <CardTitle>Glass Card</CardTitle>
              <CardDescription>Modern translucent effect</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This card has a glass-like appearance with backdrop blur.</p>
            </CardContent>
            <CardFooter>
              <Button variant="accent">Action</Button>
            </CardFooter>
          </Card>

          <Card variant="feature" size="lg">
            <CardHeader>
              <CardTitle>Feature Card</CardTitle>
              <CardDescription>Highlight important features</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Use this card to highlight key features or content.</p>
            </CardContent>
            <CardFooter>
              <Button variant="default">Action</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Default Input</label>
              <Input placeholder="Default style input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Elegant Input</label>
              <Input variant="elegant" placeholder="Elegant style input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Filled Input</label>
              <Input variant="filled" placeholder="Filled style input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Ghost Input</label>
              <Input variant="ghost" placeholder="Ghost style input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Lumea Input</label>
              <Input variant="lumea" placeholder="Lumea style input" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Small Input</label>
              <Input size="sm" placeholder="Small input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Default Size Input</label>
              <Input size="default" placeholder="Default size input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Large Input</label>
              <Input size="lg" placeholder="Large input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Extra Large Input</label>
              <Input size="xl" placeholder="Extra large input" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rounded Input</label>
              <Input radius="full" placeholder="Rounded input" />
            </div>
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Badges</h2>
        <div className="grid gap-6">
          <div className="flex flex-wrap gap-4">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="lumea">Lumea</Badge>
            <Badge variant="subtle">Subtle</Badge>
            <Badge variant="ghost">Ghost</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </div>
          <div className="flex flex-wrap gap-4">
            <Badge variant="default" size="sm">
              Small
            </Badge>
            <Badge variant="default" size="default">
              Default
            </Badge>
            <Badge variant="default" size="lg">
              Large
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4">
            <Badge variant="default" rounded="default">
              Pill
            </Badge>
            <Badge variant="default" rounded="md">
              Medium
            </Badge>
            <Badge variant="default" rounded="sm">
              Small
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4">
            <Badge variant="default">
              <Check className="h-3 w-3 mr-1" /> With Icon
            </Badge>
            <Badge variant="accent">
              <Bell className="h-3 w-3 mr-1" /> Notifications
            </Badge>
          </div>
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Alerts</h2>
        <div className="grid gap-6">
          <Alert variant="default">
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>This is a default alert with basic styling.</AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Alert</AlertTitle>
            <AlertDescription>
              This is a destructive alert for errors and warnings.
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <Check className="h-4 w-4" />
            <AlertTitle>Success Alert</AlertTitle>
            <AlertDescription>This is a success alert for confirming actions.</AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning Alert</AlertTitle>
            <AlertDescription>This is a warning alert for potential issues.</AlertDescription>
          </Alert>

          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Info Alert</AlertTitle>
            <AlertDescription>This is an information alert for general notices.</AlertDescription>
          </Alert>

          <Alert variant="accent">
            <AlertTitle>Accent Alert</AlertTitle>
            <AlertDescription>This is an accent alert using the accent color.</AlertDescription>
          </Alert>

          <Alert variant="lumea">
            <AlertTitle>Lumea Alert</AlertTitle>
            <AlertDescription>This is a Lumea-styled alert with brand colors.</AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Select */}
      <section className="space-y-4">
        <h2 className="text-3xl font-serif border-b pb-2">Select</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Default Select</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Elegant Select</label>
              <Select>
                <SelectTrigger variant="elegant">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Filled Select</label>
              <Select>
                <SelectTrigger variant="filled">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Lumea Select</label>
              <Select>
                <SelectTrigger variant="lumea">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Small Select</label>
              <Select>
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Small select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Default Size Select</label>
              <Select>
                <SelectTrigger size="default">
                  <SelectValue placeholder="Default size select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Large Select</label>
              <Select>
                <SelectTrigger size="lg">
                  <SelectValue placeholder="Large select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rounded Select</label>
              <Select>
                <SelectTrigger radius="lg">
                  <SelectValue placeholder="Rounded select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DesignSystemShowcase;
