import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import DailyQuote from "@/models/DailyQuote";

export async function GET() {
  try {
    await dbConnect();

    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have a quote for today
    let dailyQuote = await DailyQuote.findOne({ date: today });

    if (!dailyQuote) {
      // Fetch from ZenQuotes API
      const response = await fetch("https://zenquotes.io/api/random", {
        next: { revalidate: 0 } // Don't cache the ZenQuotes call itself here
      });
      
      const data = await response.json();
      
      if (data && data[0]) {
        dailyQuote = await DailyQuote.create({
          text: data[0].q,
          author: data[0].a,
          date: today,
        });
      }
    }

    if (!dailyQuote) {
      // Fallback if API fails
      return NextResponse.json({
        text: "The only way to do great work is to love what you do.",
        author: "Steve Jobs"
      });
    }

    return NextResponse.json({
      text: dailyQuote.text,
      author: dailyQuote.author,
    });
  } catch (error) {
    console.error("Quote API Error:", error);
    // Return a fallback quote on error
    return NextResponse.json({
      text: "The only way to do great work is to love what you do.",
      author: "Steve Jobs"
    });
  }
}
