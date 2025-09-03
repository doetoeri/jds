import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In a real application, get this value from a database or environment variable
const isMaintenanceMode = false; // Placeholder

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const exemptPages = ['/login', '/admin', '/']; // Add your landing page path if it's not '/'

  // If maintenance mode is on and the requested page is not exempt, redirect to maintenance page
  if (isMaintenanceMode && !exemptPages.includes(pathname)) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Continue to the requested page
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)', // Apply middleware to all paths except API routes and static files
};